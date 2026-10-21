import unittest
import server


class HealthToolsTests(unittest.TestCase):
    def test_two_servers_cannot_share_the_same_listener(self):
        first = server.MrDocHTTPServer(('127.0.0.1', 0), server.Handler)
        try:
            with self.assertRaises(OSError):
                second = server.MrDocHTTPServer(first.server_address, server.Handler)
                second.server_close()
        finally:
            first.server_close()

    def test_card_reader_leaves_unclear_identifiers_blank(self):
        self.assertEqual(server.normalize_abha_details({'abhaNumber': '1234?678901234', 'abhaAddress': 'person@example.com'}), {'abhaNumber': '', 'abhaAddress': ''})
        self.assertEqual(server.normalize_abha_details({'abhaNumber': '12 3456 7890 1234', 'abhaAddress': 'fictional@sbx'})['abhaNumber'], '12-3456-7890-1234')

    def test_record_bundle_has_no_unvalidated_abdm_profile_or_invented_clinical_code(self):
        bundle = server.build_fhir_bundle({'patientName': 'Fictional patient', 'recordType': 'Lab Report', 'summary': 'Synthetic summary', 'labTests': [{'test': 'Example marker', 'value': '4', 'unit': 'mg/dL', 'needsReview': True, 'status': 'HIGH'}]})
        self.assertEqual(bundle['type'], 'collection')
        self.assertNotIn('meta', bundle)
        resources = [entry['resource'] for entry in bundle['entry']]
        lab = next(resource for resource in resources if resource['resourceType'] == 'Observation')
        self.assertEqual(lab['code'], {'text': 'Example marker'})
        self.assertEqual(lab['status'], 'preliminary')
        self.assertNotIn('interpretation', lab)
        refs = {entry['fullUrl'] for entry in bundle['entry']}
        for resource in resources:
            if 'subject' in resource:
                self.assertIn(resource['subject']['reference'], refs)


if __name__ == '__main__':
    unittest.main()
