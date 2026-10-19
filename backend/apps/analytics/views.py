# apps/analytics/views.py
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from utils.permissions import IsCompanyMember

from .reports import PERIODS, build_report


class AnalyticsReportView(APIView):
    """
    GET /api/v1/analytics/report/?days=30
    Company-wide figures for the period (7, 30 or 90 days), each compared with the period before,
    plus daily series and per-module breakdowns.
    """
    permission_classes = [IsAuthenticated, IsCompanyMember]

    def get(self, request):
        try:
            days = int(request.query_params.get('days', 30))
        except ValueError:
            days = 30
        if days not in PERIODS:
            days = 30
        return Response(build_report(request.user.company, days))
