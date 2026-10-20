#!/usr/bin/env python3
"""
Run the Northflank migration job and wait for it, tolerating Northflank's quirks:

- If a run is already in progress (HTTP 409), wait for that run instead of failing.
- A run's overall status can lag behind its pod: count it as done as soon as Northflank reports a
  successful completion, even if the status still says RUNNING.

Only status counters are printed (never raw API responses): Actions logs are public on this repo.

Env: NF_TOKEN, NF_PROJECT, NF_JOB. Optional: TIMEOUT_SECONDS (default 900), POLL_SECONDS (default 10).
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request

API = os.environ.get('NF_API', 'https://api.northflank.com/v1')  # overridable for tests
TOKEN, PROJECT, JOB = (os.environ.get(k, '') for k in ('NF_TOKEN', 'NF_PROJECT', 'NF_JOB'))
TIMEOUT = int(os.environ.get('TIMEOUT_SECONDS', '900'))
POLL = int(os.environ.get('POLL_SECONDS', '10'))


def call(method, path, body=None):
    req = urllib.request.Request(f'{API}/projects/{PROJECT}/jobs/{JOB}{path}', method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        return e.code, {}
    except (urllib.error.URLError, TimeoutError) as e:
        print(f'  network error: {e.__class__.__name__}')
        return 0, {}


def latest_run():
    code, data = call('GET', '/runs')
    runs = (data.get('data') or {}).get('runs') or []
    # the docs don't promise an order, so pick the most recently started run ourselves
    runs.sort(key=lambda r: r.get('startedAt') or '', reverse=True)
    return runs[0].get('id') if runs else None


def outcome(run):
    """'success', 'failed' or None (still going), from status plus the pod counters."""
    status = str(run.get('status', '')).upper()
    succeeded, failed = int(run.get('succeeded') or 0), int(run.get('failed') or 0)
    if status == 'SUCCESS' or succeeded > 0:
        return 'success'
    if status in ('FAILED', 'ERROR') or (run.get('concluded') and failed > 0):
        return 'failed'
    return None


def main():
    if not all((TOKEN, PROJECT, JOB)):
        print('NF_TOKEN, NF_PROJECT and NF_JOB must be set')
        return 2

    code, data = 0, {}
    for attempt in range(1, 4):  # Northflank's API occasionally answers 5xx while still starting the run
        code, data = call('POST', '/runs', {'overrides': {'cmd': 'python manage.py migrate --noinput'}})
        if code in (200, 201, 409) or code < 500 and code != 0:
            break
        print(f'  start attempt {attempt}: HTTP {code}, retrying')
        time.sleep(10)

    if code in (200, 201):
        run_id = (data.get('data') or {}).get('id')
        print('Migration run started')
    elif code == 409 or code >= 500:
        run_id = latest_run()  # one is already running (possibly started by an attempt that errored)
        print(f'HTTP {code} starting the run; following the latest run instead')
    else:
        print(f'Could not start the migration run: HTTP {code}')
        return 1
    if not run_id:
        print('No migration run to follow')
        return 1

    deadline = time.time() + TIMEOUT
    i = 0
    while time.time() < deadline:
        i += 1
        code, data = call('GET', f'/runs/{run_id}')
        run = data.get('data') or {}
        print(f"  check {i}: status={run.get('status', '?')} active={run.get('active', '?')} "
              f"succeeded={run.get('succeeded', '?')} failed={run.get('failed', '?')}")
        result = outcome(run) if code == 200 else None
        if result == 'success':
            print('Migrations completed successfully')
            return 0
        if result == 'failed':
            print('Migration job failed: check the job run logs in Northflank')
            return 1
        time.sleep(POLL)
    print(f'Migration job did not finish within {TIMEOUT // 60} minutes')
    return 1


if __name__ == '__main__':
    sys.exit(main())
