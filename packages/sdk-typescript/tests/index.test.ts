import { PrivacyLayerSDK, ShieldedPoolConfig } from '../src/index';

describe('PrivacyLayerSDK', () => {
  const validConfig: ShieldedPoolConfig = {
    contractId: 'CDMLFMN5V7XGXCK3LMKZMMJH4X3FMNWFXI3YX6KF3XMS7PCNKVN4WFZ',
    network: 'testnet',
  };

  describe('constructor', () => {
    it('should create SDK instance with valid config', () => {
      const sdk = new PrivacyLayerSDK(validConfig);
      expect(sdk).toBeInstanceOf(PrivacyLayerSDK);
      expect(sdk.getContractId()).toBe(validConfig.contractId);
      expect(sdk.getNetwork()).toBe(validConfig.network);
    });

    it('should throw error for missing contract ID', () => {
      const invalidConfig = { ...validConfig, contractId: '' };
      expect(() => new PrivacyLayerSDK(invalidConfig)).toThrow('Contract ID is required');
    });

    it('should throw error for invalid network', () => {
      const invalidConfig = { ...validConfig, network: 'invalid' as any };
      expect(() => new PrivacyLayerSDK(invalidConfig)).toThrow('Invalid network');
    });

    it('should accept mainnet network', () => {
      const mainnetConfig = { ...validConfig, network: 'mainnet' as const };
      const sdk = new PrivacyLayerSDK(mainnetConfig);
      expect(sdk.getNetwork()).toBe('mainnet');
    });

    it('should accept futurenet network', () => {
      const futurenetConfig = { ...validConfig, network: 'futurenet' as const };
      const sdk = new PrivacyLayerSDK(futurenetConfig);
      expect(sdk.getNetwork()).toBe('futurenet');
    });
  });
});
