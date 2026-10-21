from django.test import SimpleTestCase

from utils.exceptions import readable_error_message


class ReadableErrorMessageTests(SimpleTestCase):
    def test_custom_field_message_is_used_as_is(self):
        self.assertEqual(readable_error_message({'password_confirm': ['Passwords do not match.']}), 'Passwords do not match.')

    def test_generic_field_message_gets_the_field_name(self):
        self.assertEqual(readable_error_message({'email': ['Enter a valid email address.']}), 'Email: Enter a valid email address.')
        self.assertEqual(readable_error_message({'first_name': ['This field is required.']}), 'First name: This field is required.')

    def test_detail_and_non_field_errors(self):
        self.assertEqual(readable_error_message({'detail': 'Not found.'}), 'Not found.')
        self.assertEqual(readable_error_message({'non_field_errors': ['Invalid email or password.']}), 'Invalid email or password.')

    def test_nested_and_empty(self):
        self.assertEqual(readable_error_message({'items': [{'quantity': ['Must be positive.']}]}), 'Must be positive.')
        self.assertEqual(readable_error_message({}), 'An error occurred')
        self.assertEqual(readable_error_message([]), 'An error occurred')


class EmailProviderTests(SimpleTestCase):
    def test_provider_selection(self):
        from unittest.mock import patch

        from utils.emails import email_provider

        with patch.dict('os.environ', {'EMAIL_PROVIDER': '', 'RESEND_API_KEY': ''}):
            self.assertEqual(email_provider(), 'smtp')
        with patch.dict('os.environ', {'EMAIL_PROVIDER': '', 'RESEND_API_KEY': 're_x'}):
            self.assertEqual(email_provider(), 'resend')
        # An explicit choice wins, so Gmail SMTP can be used while a Resend key is still configured
        with patch.dict('os.environ', {'EMAIL_PROVIDER': 'smtp', 'RESEND_API_KEY': 're_x'}):
            self.assertEqual(email_provider(), 'smtp')



class SharedRedisPoolTests(SimpleTestCase):
    def test_one_bounded_pool_per_address(self):
        from redis import BlockingConnectionPool
        from utils.redis_pool import SharedBlockingConnectionPool

        a = SharedBlockingConnectionPool.from_url('redis://127.0.0.1:6379/9', max_connections=6, timeout=5)
        b = SharedBlockingConnectionPool.from_url('redis://127.0.0.1:6379/9', max_connections=6, timeout=5)
        other = SharedBlockingConnectionPool.from_url('redis://127.0.0.1:6379/10', max_connections=6, timeout=5)
        self.assertIs(a, b)  # every thread's cache object ends up on the same pool
        self.assertIsNot(a, other)
        self.assertIsInstance(a, BlockingConnectionPool)
        self.assertEqual(a.max_connections, 6)
