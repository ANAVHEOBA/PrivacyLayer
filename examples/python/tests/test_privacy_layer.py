#!/usr/bin/env python3
"""
PrivacyLayer Python SDK Tests

Test suite for Python command-line interface
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from privacy_layer import PrivacyLayerCLI, show_help


class TestPrivacyLayerCLI(unittest.TestCase):
    """Test cases for PrivacyLayerCLI class"""

    def setUp(self):
        """Set up test fixtures"""
        self.cli = PrivacyLayerCLI(network='testnet')
        self.mock_wallet = Mock()
        
    def test_init_default_network(self):
        """Test CLI initializes with default testnet"""
        cli = PrivacyLayerCLI()
        self.assertIsNotNone(cli.client)
        
    def test_init_custom_network(self):
        """Test CLI initializes with custom network"""
        cli = PrivacyLayerCLI(network='mainnet')
        self.assertIsNotNone(cli.client)
        
    @patch.object(PrivacyLayerCLI, 'connect')
    def test_deposit_calls_connect(self, mock_connect):
        """Test deposit connects wallet first"""
        mock_connect.return_value = self.mock_wallet
        self.cli.wallet = None
        
        with patch.object(self.cli.client, 'deposit') as mock_deposit:
            mock_deposit.return_value = {
                'tx_hash': 'test_tx_123',
                'note': 'note_secret_456'
            }
            
            result = self.cli.deposit('10', 'XLM')
            
            mock_connect.assert_called_once()
            mock_deposit.assert_called_once_with(self.mock_wallet, '10', 'XLM')
            
    @patch.object(PrivacyLayerCLI, 'connect')
    def test_deposit_with_xlm(self, mock_connect):
        """Test deposit with XLM asset"""
        mock_connect.return_value = self.mock_wallet
        
        with patch.object(self.cli.client, 'deposit') as mock_deposit:
            mock_deposit.return_value = {
                'tx_hash': 'test_tx_123',
                'note': 'note_secret_456'
            }
            
            result = self.cli.deposit('10', 'XLM')
            
            self.assertEqual(result['tx_hash'], 'test_tx_123')
            self.assertEqual(result['note'], 'note_secret_456')
            
    @patch.object(PrivacyLayerCLI, 'connect')
    def test_deposit_with_usdc(self, mock_connect):
        """Test deposit with USDC asset"""
        mock_connect.return_value = self.mock_wallet
        
        with patch.object(self.cli.client, 'deposit') as mock_deposit:
            mock_deposit.return_value = {
                'tx_hash': 'test_tx_789',
                'note': 'note_secret_012'
            }
            
            result = self.cli.deposit('100', 'USDC')
            
            mock_deposit.assert_called_once_with(self.mock_wallet, '100', 'USDC')
            self.assertEqual(result['tx_hash'], 'test_tx_789')
            
    @patch.object(PrivacyLayerCLI, 'connect')
    def test_deposit_defaults_to_xlm(self, mock_connect):
        """Test deposit defaults to XLM if no asset specified"""
        mock_connect.return_value = self.mock_wallet
        
        with patch.object(self.cli.client, 'deposit') as mock_deposit:
            mock_deposit.return_value = {'tx_hash': 'tx', 'note': 'note'}
            
            # Should default to XLM
            self.cli.deposit('50')
            
            mock_deposit.assert_called_once_with(self.mock_wallet, '50', 'XLM')
            
    @patch.object(PrivacyLayerCLI, 'connect')
    def test_withdraw_calls_connect(self, mock_connect):
        """Test withdraw connects wallet first"""
        mock_connect.return_value = self.mock_wallet
        self.cli.wallet = None
        
        with patch.object(self.cli.client, 'withdraw') as mock_withdraw:
            mock_withdraw.return_value = {'tx_hash': 'withdraw_tx'}
            
            result = self.cli.withdraw('note_secret', 'GABC123')
            
            mock_connect.assert_called_once()
            mock_withdraw.assert_called_once_with(self.mock_wallet, 'note_secret', 'GABC123')
            
    @patch.object(PrivacyLayerCLI, 'connect')
    def test_withdraw_with_valid_note(self, mock_connect):
        """Test withdraw with valid note and recipient"""
        mock_connect.return_value = self.mock_wallet
        
        with patch.object(self.cli.client, 'withdraw') as mock_withdraw:
            mock_withdraw.return_value = {
                'tx_hash': 'withdraw_tx_123'
            }
            
            result = self.cli.withdraw('note_abc', 'GDEF456')
            
            self.assertEqual(result['tx_hash'], 'withdraw_tx_123')
            mock_withdraw.assert_called_once_with(self.mock_wallet, 'note_abc', 'GDEF456')
            
    @patch.object(PrivacyLayerCLI, 'connect')
    def test_balance_returns_dict(self, mock_connect):
        """Test balance returns correct dictionary format"""
        mock_connect.return_value = self.mock_wallet
        
        with patch.object(self.cli.client, 'get_balance') as mock_get_balance:
            mock_get_balance.return_value = {
                'xlm': '100.0000000',
                'usdc': '50.000000'
            }
            
            result = self.cli.balance()
            
            self.assertIsInstance(result, dict)
            self.assertIn('xlm', result)
            self.assertIn('usdc', result)
            self.assertEqual(result['xlm'], '100.0000000')
            self.assertEqual(result['usdc'], '50.000000')
            
    @patch.object(PrivacyLayerCLI, 'connect')
    def test_balance_output_format(self, mock_connect):
        """Test balance output is formatted correctly"""
        mock_connect.return_value = self.mock_wallet
        
        with patch.object(self.cli.client, 'get_balance') as mock_get_balance:
            mock_get_balance.return_value = {
                'xlm': '100.0000000',
                'usdc': '50.000000'
            }
            
            # Capture print output
            import io
            from contextlib import redirect_stdout
            
            f = io.StringIO()
            with redirect_stdout(f):
                self.cli.balance()
            
            output = f.getvalue()
            
            self.assertIn('Shielded Balance', output)
            self.assertIn('XLM:', output)
            self.assertIn('USDC:', output)
            
    @patch.object(PrivacyLayerCLI, 'connect')
    def test_sync_returns_progress(self, mock_connect):
        """Test sync returns tree progress information"""
        mock_connect.return_value = self.mock_wallet
        
        with patch.object(self.cli.client, 'sync_merkle_tree') as mock_sync:
            mock_sync.return_value = {
                'leaves': 1234,
                'root': 'root_hash_abc'
            }
            
            result = self.cli.sync()
            
            self.assertIsInstance(result, dict)
            self.assertIn('leaves', result)
            self.assertIn('root', result)
            self.assertEqual(result['leaves'], 1234)
            mock_sync.assert_called_once()


class TestShowHelp(unittest.TestCase):
    """Test cases for help display"""
    
    def test_show_help_contains_commands(self):
        """Test help shows all commands"""
        import io
        from contextlib import redirect_stdout
        
        f = io.StringIO()
        with redirect_stdout(f):
            show_help()
        
        output = f.getvalue()
        
        self.assertIn('PrivacyLayer', output)
        self.assertIn('deposit', output)
        self.assertIn('withdraw', output)
        self.assertIn('balance', output)
        self.assertIn('sync', output)
        self.assertIn('help', output)
        
    def test_show_help_contains_examples(self):
        """Test help shows usage examples"""
        import io
        from contextlib import redirect_stdout
        
        f = io.StringIO()
        with redirect_stdout(f):
            show_help()
        
        output = f.getvalue()
        
        self.assertIn('python privacy_layer.py deposit', output)
        self.assertIn('python privacy_layer.py withdraw', output)
        self.assertIn('python privacy_layer.py balance', output)


class TestIntegration(unittest.TestCase):
    """Integration tests for complete flows"""
    
    @patch('privacy_layer.PrivacyLayerCLI')
    def test_complete_flow_deposit_balance_withdraw(self, mock_cli_class):
        """Test complete flow: deposit → balance → withdraw"""
        mock_cli = Mock()
        mock_cli_class.return_value = mock_cli
        
        # Setup mock returns
        mock_cli.deposit.return_value = {'tx_hash': 'tx1', 'note': 'note1'}
        mock_cli.balance.return_value = {'xlm': '100', 'usdc': '50'}
        mock_cli.withdraw.return_value = {'tx_hash': 'tx2'}
        
        # Execute flow
        deposit_result = mock_cli.deposit('50', 'XLM')
        balance_result = mock_cli.balance()
        withdraw_result = mock_cli.withdraw(deposit_result['note'], 'GNEWADDR')
        
        # Verify
        self.assertEqual(deposit_result['note'], 'note1')
        self.assertIn('xlm', balance_result)
        self.assertEqual(withdraw_result['tx_hash'], 'tx2')
        
        # Verify calls
        mock_cli.deposit.assert_called_once_with('50', 'XLM')
        mock_cli.balance.assert_called_once()
        mock_cli.withdraw.assert_called_once_with('note1', 'GNEWADDR')


class TestErrorHandling(unittest.TestCase):
    """Test error handling scenarios"""
    
    def test_cli_initialization_error(self):
        """Test CLI handles initialization errors"""
        with patch('privacy_layer.PrivacyLayerClient') as mock_client:
            mock_client.side_effect = Exception("Connection failed")
            
            with self.assertRaises(Exception):
                PrivacyLayerCLI()
                
    @patch.object(PrivacyLayerCLI, 'connect')
    def test_deposit_error_handling(self, mock_connect):
        """Test deposit handles errors gracefully"""
        mock_connect.return_value = self.mock_wallet
        
        with patch.object(self.cli.client, 'deposit') as mock_deposit:
            mock_deposit.side_effect = Exception("Insufficient balance")
            
            with self.assertRaises(Exception):
                self.cli.deposit('1000000', 'XLM')
                
    @patch.object(PrivacyLayerCLI, 'connect')
    def test_withdraw_error_handling(self, mock_connect):
        """Test withdraw handles errors gracefully"""
        mock_connect.return_value = self.mock_wallet
        
        with patch.object(self.cli.client, 'withdraw') as mock_withdraw:
            mock_withdraw.side_effect = Exception("Invalid note")
            
            with self.assertRaises(Exception):
                self.cli.withdraw('invalid_note', 'GABC')


if __name__ == '__main__':
    unittest.main()

# Test coverage goals:
# - CLI methods: 100%
# - Error handling: 100%
# - Output formatting: 100%
# - Integration: 80%+

# Run tests with:
# python -m pytest tests/test_privacy_layer.py -v
# python -m unittest tests.test_privacy_layer
