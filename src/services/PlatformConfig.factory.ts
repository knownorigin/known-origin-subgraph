import {PlatformConfig} from '../../generated/schema';
import {Bytes} from "@graphprotocol/graph-ts";

const KO_V3_MARKET_CONFIG_ID = 'koda-v3';

export function getPlatformConfig(): PlatformConfig {
    let config = PlatformConfig.load(Bytes.fromUTF8(KO_V3_MARKET_CONFIG_ID));
    if (config == null) {
        config = new PlatformConfig(Bytes.fromUTF8(KO_V3_MARKET_CONFIG_ID));
    }
    return config as PlatformConfig;
}
