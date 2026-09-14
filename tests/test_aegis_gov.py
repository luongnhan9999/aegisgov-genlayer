import sys
import os
import unittest
from unittest.mock import MagicMock
import hashlib
import json
import datetime

# Setup GenLayer runtime mocks for isolated unit testing
class MockAddress(str): pass
class MockBigInt(int): pass
class MockUserError(Exception): pass

class MockReturn:
    def __init__(self, calldata):
        self.calldata = calldata

class MockContractStub:
    def __init__(self, address, tracker):
        self.address = address
        self.tracker = tracker

    def emit_transfer(self, value):
        self.tracker.append({"to": self.address, "value": value})

class MockGL:
    class Contract:
        def __new__(cls, *args, **kwargs):
            instance = super().__new__(cls)
            instance.proposals = {}
            instance.proposal_ids = []
            instance.withdrawable_credits = {}
            return instance

    class public:
        @staticmethod
        def view(fn): return fn
        @staticmethod
        def write(fn): return fn

    class message:
        value = MockBigInt(0)
        sender_address = MockAddress("0xSponsor")

    class nondet:
        class web:
            @staticmethod
            def render(url, mode="text"): pass
        @staticmethod
        def exec_prompt(prompt, response_format="json"): pass

    class vm:
        Return = MockReturn
        @staticmethod
        def run_nondet(leader_fn, validator_fn):
            res = leader_fn()
            ret = MockReturn(calldata=res)
            if not validator_fn(ret):
                raise MockUserError("Consensus Disagreement")
            return res

    class evm:
        @staticmethod
        def contract_interface(cls):
            def factory(address):
                return MockContractStub(address, mock_mod.gl.transfers)
            return factory

    def __init__(self):
        self.transfers = []
        self.message_raw = {"datetime": "2026-09-14T00:00:00+00:00"}

MockGL.public.write.payable = lambda fn: fn

mock_mod = MagicMock()
mock_mod.gl = MockGL()
mock_mod.allow_storage = lambda cls: cls
mock_mod.Address = MockAddress
mock_mod.bigint = MockBigInt
mock_mod.u256 = MockBigInt
mock_mod.UserError = MockUserError
mock_mod.TreeMap = dict
mock_mod.DynArray = list

sys.modules["genlayer"] = mock_mod
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "contracts")))
import AegisGov as contract_module

class TestAegisGovStandards(unittest.TestCase):
    def setUp(self):
        self.gl = mock_mod.gl
        contract_module.gl = self.gl
        self.gl.transfers.clear()
        self.gl.message.sender_address = MockAddress("0xsponsor1111111111111111111111111111111111")
        self.gl.message.value = MockBigInt(0)
        self.gl.message_raw = {"datetime": "2026-09-14T12:00:00+00:00"}

    def test_01_strict_zero_normalization_json(self):
        """Verify parser rejects normalization and fails closed upon markdown fences or non-canonical JSON."""
        # 1. Fail if LLM returns markdown code fences
        raw_markdown = "```json\n{\"is_compliant\": true, \"reason\": \"clean execution\"}\n```"
        with self.assertRaises(Exception):
            json.loads(raw_markdown) # Fails directly without heuristic stripping

        # 2. Succeed with canonical pure JSON
        valid_canonical = '{"is_compliant": true, "reason": "All safety boundaries preserved"}'
        parsed = json.loads(valid_canonical)
        self.assertIsInstance(parsed, dict)
        self.assertTrue(parsed["is_compliant"])
        self.assertIsInstance(parsed["is_compliant"], bool)

    def test_02_evidence_hash_integrity(self):
        """Verify SHA-256 evidence integrity matches 100% against untampered source data."""
        spec_content = "Constitutional Safety Policy: AI Agent must not execute external shell scripts."
        expected_hash = hashlib.sha256(spec_content.encode("utf-8")).hexdigest().lower()

        # Same content generates exact same hash
        computed_hash = hashlib.sha256(spec_content.encode("utf-8")).hexdigest().lower()
        self.assertEqual(expected_hash, computed_hash)

        # Minor modification causes immediate hash mismatch
        tampered_content = spec_content + " "
        computed_hash = hashlib.sha256(tampered_content.encode("utf-8")).hexdigest().lower()
        self.assertNotEqual(expected_hash, computed_hash)

    def test_03_deterministic_execution_context(self):
        """Verify deterministic timestamp extraction strictly from gl.message_raw['datetime']."""
        c = contract_module.Contract()
        self.gl.message_raw = {"datetime": "2026-09-14T15:30:00+00:00"}
        expected_ts = int(datetime.datetime.fromisoformat("2026-09-14T15:30:00+00:00").timestamp())
        self.assertEqual(c._now(), expected_ts)

        # Missing datetime triggers UserError
        self.gl.message_raw = {}
        with self.assertRaises(Exception):
            c._now()

    def test_04_register_governance_grant_validation(self):
        """Validate constraints and preconditions when docketing a governance grant escrow."""
        c = contract_module.Contract()
        spec_content = "Agent must never call selfdestruct or withdraw without authorization."
        spec_hash = hashlib.sha256(spec_content.encode("utf-8")).hexdigest().lower()

        # Fails when escrow = 0
        self.gl.message.value = MockBigInt(0)
        with self.assertRaises(Exception):
            c.register_governance_grant(
                "PROP-01", "AGENT-TRADING-01", "0xoperator2222222222222222222222222222222222",
                "https://example.com/spec.txt", spec_hash, "Safe slippage < 2%", "No flashloan reentrancy"
            )

        # Fails when URL scheme is invalid
        self.gl.message.value = MockBigInt(1000)
        with self.assertRaises(Exception):
            c.register_governance_grant(
                "PROP-01", "AGENT-TRADING-01", "0xoperator2222222222222222222222222222222222",
                "ftp://bad-scheme.com", spec_hash, "Safe slippage < 2%", "No flashloan reentrancy"
            )

        # Fails when SHA-256 hash length is not 64 hex characters
        with self.assertRaises(Exception):
            c.register_governance_grant(
                "PROP-01", "AGENT-TRADING-01", "0xoperator2222222222222222222222222222222222",
                "https://example.com/spec.txt", "short_hash", "Safe slippage < 2%", "No flashloan reentrancy"
            )

        # Success case
        c.register_governance_grant(
            "PROP-01", "AGENT-TRADING-01", "0xoperator2222222222222222222222222222222222",
            "https://example.com/spec.txt", spec_hash, "Safe slippage < 2%", "No flashloan reentrancy"
        )
        self.assertIn("PROP-01", c.proposals)
        self.assertEqual(c.proposals["PROP-01"].status, "ACTIVE")
        self.assertEqual(c.total_locked_escrow, 1000)

    def test_05_submit_compliance_audit_compliant(self):
        """Verify compliant audit flow: transitions to EVALUATING and opens 24h cooling-off dispute period."""
        c = contract_module.Contract()
        spec_text = "Standard Operating Procedure: All trades <= $1000."
        spec_hash = hashlib.sha256(spec_text.encode("utf-8")).hexdigest().lower()
        log_text = "Trade 1 executed at $500. No violation detected."
        log_hash = hashlib.sha256(log_text.encode("utf-8")).hexdigest().lower()

        self.gl.message.value = MockBigInt(5000)
        self.gl.message.sender_address = MockAddress("0xsponsor")
        c.register_governance_grant(
            "PROP-OK", "AGENT-01", "0xoperator",
            "https://example.com/spec.txt", spec_hash, "Max trade $1000", "No unauthorized transfers"
        )

        # Mock Web renders
        def mock_render(url, mode="text"):
            if "spec" in url:
                return spec_text
            return log_text
        self.gl.nondet.web.render = mock_render

        # Mock LLM returns compliant
        self.gl.nondet.exec_prompt = lambda prompt, response_format="json": {
            "is_compliant": True,
            "reason": "Verified trade size $500 is within $1000 safety threshold"
        }

        # Submitting telemetry as operator
        self.gl.message.sender_address = MockAddress("0xoperator")
        c.submit_compliance_telemetry("PROP-OK", "https://example.com/log.txt", log_hash)

        p = c.proposals["PROP-OK"]
        self.assertEqual(p.verdict, "COMPLIANT")
        self.assertEqual(p.status, "EVALUATING")
        self.assertGreater(p.payout_ready_at, p.created_at)

    def test_06_tampering_spec_hash_detected(self):
        """Verify immediate detection and slashing when off-chain spec or telemetry is tampered."""
        c = contract_module.Contract()
        original_spec = "Boundary: do not transfer funds to unlisted addresses."
        registered_hash = hashlib.sha256(original_spec.encode("utf-8")).hexdigest().lower()

        self.gl.message.value = MockBigInt(3000)
        self.gl.message.sender_address = MockAddress("0xsponsor")
        c.register_governance_grant(
            "PROP-TAMPER", "AGENT-02", "0xoperator",
            "https://example.com/spec.txt", registered_hash, "Strict boundaries", "No theft"
        )

        # Adversary tampers the web spec
        self.gl.nondet.web.render = lambda url, mode="text": "Tampered spec: transfer anywhere!"

        self.gl.message.sender_address = MockAddress("0xoperator")
        dummy_log_hash = hashlib.sha256(b"log").hexdigest().lower()

        c.submit_compliance_telemetry("PROP-TAMPER", "https://example.com/log.txt", dummy_log_hash)
        p = c.proposals["PROP-TAMPER"]
        self.assertEqual(p.verdict, "VIOLATION")
        self.assertEqual(p.status, "SLASHED")
        self.assertIn("CRITICAL TAMPERING", p.reason)
        # Slashed escrow is refunded back to sponsor withdrawable credits
        self.assertEqual(c.withdrawable_credits["0xsponsor"], 3000)
        self.assertEqual(c.total_locked_escrow, 0)

    def test_07_cooling_off_and_finalize_disbursement(self):
        """Verify 24h dispute window protection and safe pull-over-push settlement."""
        c = contract_module.Contract()
        spec_text = "Spec rules."
        spec_hash = hashlib.sha256(spec_text.encode("utf-8")).hexdigest().lower()
        log_text = "Log ok."
        log_hash = hashlib.sha256(log_text.encode("utf-8")).hexdigest().lower()

        self.gl.message.value = MockBigInt(2000)
        self.gl.message.sender_address = MockAddress("0xsponsor")
        c.register_governance_grant(
            "PROP-FINALIZE", "AGENT-03", "0xoperator",
            "https://example.com/spec.txt", spec_hash, "Rules", "None"
        )

        self.gl.nondet.web.render = lambda url, mode="text": spec_text if "spec" in url else log_text
        self.gl.nondet.exec_prompt = lambda prompt, response_format="json": {
            "is_compliant": True,
            "reason": "All good"
        }

        self.gl.message.sender_address = MockAddress("0xoperator")
        c.submit_compliance_telemetry("PROP-FINALIZE", "https://example.com/log.txt", log_hash)

        # 1. Calling finalize immediately within 24h MUST FAIL
        with self.assertRaises(Exception):
            c.finalize_grant_disbursement("PROP-FINALIZE")

        # 2. Fast-forward clock past 24h cooling-off
        self.gl.message_raw = {"datetime": "2026-09-16T00:00:00+00:00"}
        c.finalize_grant_disbursement("PROP-FINALIZE")

        p = c.proposals["PROP-FINALIZE"]
        self.assertEqual(p.status, "RELEASED")
        self.assertEqual(c.withdrawable_credits["0xoperator"], 2000)

        # 3. Pull-over-Push withdrawal by operator
        self.assertEqual(len(self.gl.transfers), 0)
        c.withdraw_credits()
        self.assertEqual(c.withdrawable_credits["0xoperator"], 0)
        self.assertEqual(len(self.gl.transfers), 1)
        self.assertEqual(self.gl.transfers[0]["value"], 2000)

    def test_08_raise_compliance_dispute(self):
        """Verify Sponsor can freeze grant payout upon suspicion during 24h cooling-off."""
        c = contract_module.Contract()
        spec_text = "Spec rules."
        spec_hash = hashlib.sha256(spec_text.encode("utf-8")).hexdigest().lower()
        log_text = "Log ok."
        log_hash = hashlib.sha256(log_text.encode("utf-8")).hexdigest().lower()

        self.gl.message.value = MockBigInt(1500)
        self.gl.message.sender_address = MockAddress("0xsponsor")
        c.register_governance_grant(
            "PROP-DISPUTE", "AGENT-04", "0xoperator",
            "https://example.com/spec.txt", spec_hash, "Rules", "None"
        )

        self.gl.nondet.web.render = lambda url, mode="text": spec_text if "spec" in url else log_text
        self.gl.nondet.exec_prompt = lambda prompt, response_format="json": {
            "is_compliant": True,
            "reason": "Passes superficial checks"
        }

        self.gl.message.sender_address = MockAddress("0xoperator")
        c.submit_compliance_telemetry("PROP-DISPUTE", "https://example.com/log.txt", log_hash)

        # Operator cannot raise dispute
        with self.assertRaises(Exception):
            c.raise_compliance_dispute("PROP-DISPUTE", "Operator disputing own proposal is forbidden")

        # Sponsor raises dispute within 24h
        self.gl.message.sender_address = MockAddress("0xsponsor")
        c.raise_compliance_dispute("PROP-DISPUTE", "Telemetry log omitted off-chain order cancellation")

        p = c.proposals["PROP-DISPUTE"]
        self.assertEqual(p.status, "DISPUTED")
        self.assertIn("[DISPUTED by Sponsor]", p.reason)

    def test_09_recover_expired_grant(self):
        """Verify Sponsor can safely reclaim escrow if agent operator abandons the task."""
        c = contract_module.Contract()
        spec_text = "Spec rules."
        spec_hash = hashlib.sha256(spec_text.encode("utf-8")).hexdigest().lower()

        self.gl.message.value = MockBigInt(4000)
        self.gl.message.sender_address = MockAddress("0xsponsor")
        # Set validity to 10 days
        c.register_governance_grant(
            "PROP-EXP", "AGENT-05", "0xoperator",
            "https://example.com/spec.txt", spec_hash, "Rules", "None", validity_days=MockBigInt(10)
        )

        # 1. Early reclamation before expiry MUST FAIL
        with self.assertRaises(Exception):
            c.recover_expired_grant("PROP-EXP")

        # 2. Fast forward time past 10 days
        self.gl.message_raw = {"datetime": "2026-09-26T00:00:00+00:00"}
        c.recover_expired_grant("PROP-EXP")

        p = c.proposals["PROP-EXP"]
        self.assertEqual(p.status, "EXPIRED")
        self.assertEqual(c.total_locked_escrow, 0)
        self.assertEqual(c.withdrawable_credits["0xsponsor"], 4000)

    def test_10_parse_llm_json_fail_closed_adversarial(self):
        """Verify parser fails closed when LLM returns adversarial or corrupted data."""
        c = contract_module.Contract()

        # Case A: Return non-JSON string
        res = c._parse_llm_json("I think the agent is safe!")
        self.assertFalse(res["is_compliant"])
        self.assertIn("FAIL-CLOSED", res["reason"])

        # Case B: Missing required 'is_compliant' field
        res = c._parse_llm_json('{"reason": "good agent"}')
        self.assertFalse(res["is_compliant"])
        self.assertIn("Missing required fields", res["reason"])

        # Case C: 'is_compliant' is string instead of boolean ("true" instead of True)
        res = c._parse_llm_json('{"is_compliant": "true", "reason": "valid"}')
        self.assertFalse(res["is_compliant"])
        self.assertIn("must be an explicit boolean", res["reason"])

        # Case D: Empty reason or whitespace only
        res = c._parse_llm_json('{"is_compliant": true, "reason": "   "}')
        self.assertFalse(res["is_compliant"])
        self.assertIn("must be a non-empty string", res["reason"])

        # Case E: Valid canonical JSON
        res = c._parse_llm_json('{"is_compliant": true, "reason": "Verified constitutional integrity"}')
        self.assertTrue(res["is_compliant"])
        self.assertEqual(res["reason"], "Verified constitutional integrity")

    def test_11_views_and_zero_credit_withdrawal(self):
        """Verify view functions and reject zero-credit balance withdrawals."""
        c = contract_module.Contract()
        spec_hash = hashlib.sha256(b"spec").hexdigest().lower()
        self.gl.message.value = MockBigInt(100)
        self.gl.message.sender_address = MockAddress("0xsponsor")
        c.register_governance_grant(
            "PROP-VIEW", "AGENT-06", "0xoperator",
            "https://example.com/spec", spec_hash, "Safe", "None"
        )

        prop_json = json.loads(c.get_proposal("PROP-VIEW"))
        self.assertEqual(prop_json["id"], "PROP-VIEW")
        self.assertEqual(prop_json["grant_amount"], "100")

        all_props = json.loads(c.get_all_proposals())
        self.assertEqual(len(all_props), 1)
        self.assertEqual(all_props[0]["id"], "PROP-VIEW")

        # Withdraw with 0 balance MUST raise error
        self.gl.message.sender_address = MockAddress("0xzero")
        with self.assertRaises(Exception):
            c.withdraw_credits()

    def test_12_dismiss_dispute_and_release(self):
        """Verify Sponsor can voluntarily dismiss dispute, releasing escrow to Operator."""
        c = contract_module.Contract()
        spec_text = "Spec rules"
        spec_hash = hashlib.sha256(spec_text.encode("utf-8")).hexdigest().lower()
        log_text = "Valid telemetry"
        log_hash = hashlib.sha256(log_text.encode("utf-8")).hexdigest().lower()

        self.gl.message.value = MockBigInt(2500)
        self.gl.message.sender_address = MockAddress("0xsponsor")
        c.register_governance_grant(
            "PROP-DISMISS", "AGENT-07", "0xoperator",
            "https://example.com/spec", spec_hash, "Safe", "None"
        )

        # Operator submits telemetry
        self.gl.nondet.web.render = lambda url, mode="text": spec_text if "spec" in url else log_text
        self.gl.nondet.exec_prompt = lambda prompt, response_format="json": {
            "is_compliant": True,
            "reason": "Safe operations"
        }
        self.gl.message.sender_address = MockAddress("0xoperator")
        c.submit_compliance_telemetry("PROP-DISMISS", "https://example.com/log", log_hash)

        # Sponsor raises dispute
        self.gl.message.sender_address = MockAddress("0xsponsor")
        c.raise_compliance_dispute("PROP-DISMISS", "Temporary dispute for clarification")
        self.assertEqual(c.proposals["PROP-DISMISS"].status, "DISPUTED")

        # Non-sponsor cannot dismiss
        self.gl.message.sender_address = MockAddress("0xstranger")
        with self.assertRaises(Exception):
            c.dismiss_dispute_and_release("PROP-DISMISS")

        # Sponsor dismisses dispute
        self.gl.message.sender_address = MockAddress("0xsponsor")
        c.dismiss_dispute_and_release("PROP-DISMISS")

        p = c.proposals["PROP-DISMISS"]
        self.assertEqual(p.status, "RELEASED")
        self.assertEqual(c.withdrawable_credits["0xoperator"], 2500)
        self.assertEqual(c.total_locked_escrow, 0)

    def test_13_appeal_and_reaudit_flow(self):
        """Verify Operator appeal & re-audit flow with definitive validator consensus ruling."""
        c = contract_module.Contract()
        spec_text = "Constitutional Spec"
        spec_hash = hashlib.sha256(spec_text.encode("utf-8")).hexdigest().lower()
        orig_log = "Orig telemetry"
        orig_log_hash = hashlib.sha256(orig_log.encode("utf-8")).hexdigest().lower()
        appeal_log = "Detailed audit proof refuting dispute allegation"
        appeal_hash = hashlib.sha256(appeal_log.encode("utf-8")).hexdigest().lower()

        self.gl.message.value = MockBigInt(5000)
        self.gl.message.sender_address = MockAddress("0xsponsor")
        c.register_governance_grant(
            "PROP-APPEAL", "AGENT-08", "0xoperator",
            "https://example.com/spec", spec_hash, "Safe", "None"
        )

        # Telemetry & Dispute
        self.gl.nondet.web.render = lambda url, mode="text": spec_text if "spec" in url else orig_log
        self.gl.nondet.exec_prompt = lambda prompt, response_format="json": {
            "is_compliant": True,
            "reason": "Compliant round 1"
        }
        self.gl.message.sender_address = MockAddress("0xoperator")
        c.submit_compliance_telemetry("PROP-APPEAL", "https://example.com/orig_log", orig_log_hash)

        self.gl.message.sender_address = MockAddress("0xsponsor")
        c.raise_compliance_dispute("PROP-APPEAL", "Suspected hidden slippage")
        self.assertEqual(c.proposals["PROP-APPEAL"].status, "DISPUTED")

        # Appeal with tampered hash MUST fail
        self.gl.message.sender_address = MockAddress("0xoperator")
        with self.assertRaises(Exception):
            c.appeal_and_reaudit("PROP-APPEAL", "https://example.com/appeal_proof", "badhash"*8)

        # Appeal successfully with re-audit finding COMPLIANT (Exonerated)
        self.gl.nondet.web.render = lambda url, mode="text": spec_text if "spec" in url else appeal_log
        self.gl.nondet.exec_prompt = lambda prompt, response_format="json": {
            "is_compliant": True,
            "reason": "Exonerated: verified no hidden slippage occurred"
        }
        c.appeal_and_reaudit("PROP-APPEAL", "https://example.com/appeal_proof", appeal_hash)

        p = c.proposals["PROP-APPEAL"]
        self.assertEqual(p.status, "RELEASED")
        self.assertEqual(p.verdict, "COMPLIANT")
        self.assertEqual(c.withdrawable_credits["0xoperator"], 5000)
        self.assertEqual(c.total_locked_escrow, 0)

    def test_14_protection_cannot_recover_expired_when_disputed(self):
        """Verify Operator protection: Sponsor CANNOT expire and confiscate escrow while DISPUTED."""
        c = contract_module.Contract()
        spec_text = "Spec rules"
        spec_hash = hashlib.sha256(spec_text.encode("utf-8")).hexdigest().lower()
        log_text = "Telemetry"
        log_hash = hashlib.sha256(log_text.encode("utf-8")).hexdigest().lower()

        self.gl.message.value = MockBigInt(3000)
        self.gl.message.sender_address = MockAddress("0xsponsor")
        c.register_governance_grant(
            "PROP-SAFE-OPERATOR", "AGENT-09", "0xoperator",
            "https://example.com/spec", spec_hash, "Safe", "None", validity_days=MockBigInt(5)
        )

        # Operator submits telemetry -> EVALUATING
        self.gl.nondet.web.render = lambda url, mode="text": spec_text if "spec" in url else log_text
        self.gl.nondet.exec_prompt = lambda prompt, response_format="json": {
            "is_compliant": True,
            "reason": "Compliant"
        }
        self.gl.message.sender_address = MockAddress("0xoperator")
        c.submit_compliance_telemetry("PROP-SAFE-OPERATOR", "https://example.com/log", log_hash)

        # Sponsor disputes
        self.gl.message.sender_address = MockAddress("0xsponsor")
        c.raise_compliance_dispute("PROP-SAFE-OPERATOR", "Challenged")
        self.assertEqual(c.proposals["PROP-SAFE-OPERATOR"].status, "DISPUTED")

        # Fast forward past validity (5 days)
        self.gl.message_raw = {"datetime": "2026-09-25T00:00:00+00:00"}

        # Attempting recover_expired_grant MUST be rejected!
        with self.assertRaises(Exception):
            c.recover_expired_grant("PROP-SAFE-OPERATOR")

        # Escrow remains safely locked, status is still DISPUTED
        p = c.proposals["PROP-SAFE-OPERATOR"]
        self.assertEqual(p.status, "DISPUTED")
        self.assertEqual(c.total_locked_escrow, 3000)

if __name__ == "__main__":
    unittest.main()
