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
