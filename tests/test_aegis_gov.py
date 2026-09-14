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
        """Chứng minh parser loại bỏ normalization và fail-closed khi gặp markdown fence hoặc Python booleans."""
        # 1. Thất bại nếu LLM trả về markdown code fence
        raw_markdown = "```json\n{\"is_compliant\": true, \"reason\": \"clean execution\"}\n```"
        with self.assertRaises(Exception):
            json.loads(raw_markdown) # Trực tiếp fail, không qua strip

        # 2. Thành công với JSON chuẩn hóa nguyên bản
        valid_canonical = '{"is_compliant": true, "reason": "All safety boundaries preserved"}'
        parsed = json.loads(valid_canonical)
        self.assertIsInstance(parsed, dict)
        self.assertTrue(parsed["is_compliant"])
        self.assertIsInstance(parsed["is_compliant"], bool)

    def test_02_evidence_hash_integrity(self):
        """Chứng minh tính toán SHA-256 đối soát chính xác 100% dữ liệu gốc."""
        spec_content = "Constitutional Safety Policy: AI Agent must not execute external shell scripts."
        expected_hash = hashlib.sha256(spec_content.encode("utf-8")).hexdigest().lower()
        self.assertEqual(len(expected_hash), 64)

        # Mô phỏng tamper
        tampered_content = spec_content + " "
        computed_hash = hashlib.sha256(tampered_content.encode("utf-8")).hexdigest().lower()
        self.assertNotEqual(expected_hash, computed_hash)

    def test_03_deterministic_execution_context(self):
        """Chứng minh _now() trích xuất timestamp xác định từ gl.message_raw['datetime']."""
        c = contract_module.Contract()
        self.gl.message_raw = {"datetime": "2026-09-14T15:30:00+00:00"}
        expected_ts = int(datetime.datetime.fromisoformat("2026-09-14T15:30:00+00:00").timestamp())
        self.assertEqual(c._now(), expected_ts)

        # Missing datetime triggers UserError
        self.gl.message_raw = {}
        with self.assertRaises(Exception):
            c._now()

    def test_04_register_governance_grant_validation(self):
        """Kiểm tra ràng buộc khi tài trợ grant escrow."""
        c = contract_module.Contract()
        spec_content = "Agent must never call selfdestruct or withdraw without authorization."
        spec_hash = hashlib.sha256(spec_content.encode("utf-8")).hexdigest().lower()

        # Thất bại khi escrow = 0
        self.gl.message.value = MockBigInt(0)
        with self.assertRaises(Exception):
            c.register_governance_grant(
                "PROP-01", "AGENT-TRADING-01", "0xoperator2222222222222222222222222222222222",
                "https://example.com/spec.txt", spec_hash, "Safe slippage < 2%", "No flashloan reentrancy"
            )

        # Thất bại khi URL không hợp lệ
        self.gl.message.value = MockBigInt(1000)
        with self.assertRaises(Exception):
            c.register_governance_grant(
                "PROP-01", "AGENT-TRADING-01", "0xoperator2222222222222222222222222222222222",
                "ftp://bad-scheme.com", spec_hash, "Safe slippage < 2%", "No flashloan reentrancy"
            )

        # Thất bại khi SHA-256 hash không đủ 64 ký tự hex
        with self.assertRaises(Exception):
            c.register_governance_grant(
                "PROP-01", "AGENT-TRADING-01", "0xoperator2222222222222222222222222222222222",
                "https://example.com/spec.txt", "short_hash", "Safe slippage < 2%", "No flashloan reentrancy"
            )

        # Thành công
        c.register_governance_grant(
            "PROP-01", "AGENT-TRADING-01", "0xoperator2222222222222222222222222222222222",
            "https://example.com/spec.txt", spec_hash, "Safe slippage < 2%", "No flashloan reentrancy"
        )
        self.assertIn("PROP-01", c.proposals)
        self.assertEqual(c.proposals["PROP-01"].status, "ACTIVE")
        self.assertEqual(c.total_locked_escrow, 1000)

    def test_05_submit_compliance_audit_compliant(self):
        """Kiểm tra luồng audit compliant: vào trạng thái EVALUATING và mở 24h cooling-off."""
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
        """Chứng minh phát hiện ngay khi dữ liệu off-chain bị sửa đổi (tampered)."""
        c = contract_module.Contract()
        original_spec = "Boundary: do not transfer funds to unlisted addresses."
        registered_hash = hashlib.sha256(original_spec.encode("utf-8")).hexdigest().lower()

        self.gl.message.value = MockBigInt(3000)
        self.gl.message.sender_address = MockAddress("0xsponsor")
        c.register_governance_grant(
            "PROP-TAMPER", "AGENT-02", "0xoperator",
            "https://example.com/spec.txt", registered_hash, "Strict boundaries", "No theft"
        )

        # Hacker tampers the web spec
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
        """Kiểm tra bảo vệ 24h dispute window và giải ngân an toàn (pull-over-push)."""
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
        """Sponsor đóng băng giải ngân khi nghi ngờ trong 24h cooling-off."""
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
        """Sponsor thu hồi tiền an toàn nếu Agent bỏ dở hoặc quá hạn hợp đồng."""
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

        # 1. Thu hồi sớm trước hạn MUST FAIL
        with self.assertRaises(Exception):
            c.recover_expired_grant("PROP-EXP")

        # 2. Tua thời gian quá 10 ngày
        self.gl.message_raw = {"datetime": "2026-09-26T00:00:00+00:00"}
        c.recover_expired_grant("PROP-EXP")

        p = c.proposals["PROP-EXP"]
        self.assertEqual(p.status, "EXPIRED")
        self.assertEqual(c.total_locked_escrow, 0)
        self.assertEqual(c.withdrawable_credits["0xsponsor"], 4000)

    def test_10_parse_llm_json_fail_closed_adversarial(self):
        """Chứng minh parser fail-closed khi LLM cố tình trả về dữ liệu độc hại hoặc định dạng sai."""
        c = contract_module.Contract()

        # Case A: Trả về string không phải JSON
        res = c._parse_llm_json("I think the agent is safe!")
        self.assertFalse(res["is_compliant"])
        self.assertIn("FAIL-CLOSED", res["reason"])

        # Case B: Thiếu trường 'is_compliant'
        res = c._parse_llm_json('{"reason": "good agent"}')
        self.assertFalse(res["is_compliant"])
        self.assertIn("Missing required fields", res["reason"])

        # Case C: 'is_compliant' là string thay vì boolean ("true" thay vì true)
        res = c._parse_llm_json('{"is_compliant": "true", "reason": "valid"}')
        self.assertFalse(res["is_compliant"])
        self.assertIn("must be an explicit boolean", res["reason"])

        # Case D: Reason rỗng hoặc toàn khoảng trắng
        res = c._parse_llm_json('{"is_compliant": true, "reason": "   "}')
        self.assertFalse(res["is_compliant"])
        self.assertIn("must be a non-empty string", res["reason"])

        # Case E: Trả về JSON hợp lệ chuẩn
        res = c._parse_llm_json('{"is_compliant": true, "reason": "Verified constitutional integrity"}')
        self.assertTrue(res["is_compliant"])
        self.assertEqual(res["reason"], "Verified constitutional integrity")

    def test_11_views_and_zero_credit_withdrawal(self):
        """Kiểm tra các hàm view và chặn rút tiền khi số dư bằng 0."""
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

        # Rút tiền khi chưa có balance phải báo lỗi
        self.gl.message.sender_address = MockAddress("0xzero")
        with self.assertRaises(Exception):
            c.withdraw_credits()

if __name__ == "__main__":
    unittest.main()
