from unittest.mock import patch

from utils.testing import AuthenticatedAPITestCase

URL = '/api/v1/payments/exchange-rate/'


@patch('apps.payments.utils.currency_converter.CurrencyConverter.get_exchange_rates',
       return_value={'USD': 1.0, 'KES': 129.5})
class ExchangeRateTests(AuthenticatedAPITestCase):
    def test_returns_rate_and_example(self, _):
        r = self.client.get(URL, {'from': 'usd', 'to': 'kes'})
        self.assertEqual(r.status_code, 200, r.content)
        data = r.json()
        self.assertEqual((data['from'], data['to'], data['rate']), ('USD', 'KES', 129.5))
        self.assertEqual(data['example']['input'], '100 USD')
        self.assertTrue(data['example']['output'].endswith(' KES'))

    def test_requires_authentication(self, _):
        self.client.credentials()
        self.assertEqual(self.client.get(URL).status_code, 401)
