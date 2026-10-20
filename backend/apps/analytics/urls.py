# apps/analytics/urls.py
from django.urls import path

from .views import AnalyticsReportView

urlpatterns = [
    path('report/', AnalyticsReportView.as_view(), name='analytics-report'),
]
