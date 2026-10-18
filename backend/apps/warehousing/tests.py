from apps.warehousing.models import TransferItem, WarehouseTransfer
from utils.testing import AuthenticatedAPITestCase, make_company, make_product, make_warehouse

BASE = '/api/v1/warehousing'


class WarehousingTests(AuthenticatedAPITestCase):
    def make_transfer(self, company):
        return WarehouseTransfer.objects.create(
            company=company, transfer_number='TR-1',
            source_warehouse=make_warehouse(company), destination_warehouse=make_warehouse(company),
        )

    def test_transfer_item_detail_for_own_company(self):
        item = TransferItem.objects.create(transfer=self.make_transfer(self.company),
                                           product=make_product(self.company), quantity=5)
        self.assertEqual(self.client.get(f'{BASE}/transfer-items/{item.id}/').status_code, 200)

    def test_other_company_transfer_is_404(self):
        transfer = self.make_transfer(make_company())
        self.assertEqual(self.client.get(f'{BASE}/transfers/{transfer.id}/').status_code, 404)

    def test_dashboard(self):
        self.make_transfer(self.company)
        self.assertEqual(self.client.get(f'{BASE}/transfers/dashboard/').status_code, 200)
