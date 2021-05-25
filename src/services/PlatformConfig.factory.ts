import {PlatformConfig} from '../../generated/schema';

const KO_V3_MARKET_CONFIG_ID = 'koda-v3';

export function getPlatformConfig(): PlatformConfig {
    let config = PlatformConfig.load(KO_V3_MARKET_CONFIG_ID);
    if (config == null) {
        config = new PlatformConfig(KO_V3_MARKET_CONFIG_ID);
    }
    return config as PlatformConfig;
}
