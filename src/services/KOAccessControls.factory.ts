import {AccessControls} from '../../generated/schema';

const KO_ACCESS_CONTROLS_CONFIG_ID = 'ko-access-controls-v3';

export function getAccessControls(): AccessControls {
    let controls = AccessControls.load(KO_ACCESS_CONTROLS_CONFIG_ID);
    if (controls == null) {
        controls = new AccessControls(KO_ACCESS_CONTROLS_CONFIG_ID);
    }
    return controls as AccessControls;
}
