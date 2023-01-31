import {
    PlatformPrimaryCommissionUpdated,
    PlatformSecondaryCommissionUpdated,
    PlatformUpdated
} from "../../../generated/KODASettings/KODASettings";

import {
    CreatorContractSetting
} from "../../../generated/schema";

export function handlePlatformPrimaryCommissionUpdated(event: PlatformPrimaryCommissionUpdated): void {
    let settings = CreatorContractSetting.load('settings') as CreatorContractSetting
    settings.platformPrimaryCommission = event.params._percentage
    settings.save()
}

export function handlePlatformSecondaryCommissionUpdated(event: PlatformSecondaryCommissionUpdated): void {
    let settings = CreatorContractSetting.load('settings') as CreatorContractSetting
    settings.platformSecondaryCommission = event.params._percentage
    settings.save()
}

export function handlePlatformUpdated(event: PlatformUpdated): void {
    let settings = CreatorContractSetting.load('settings') as CreatorContractSetting
    settings.platform = event.params._platform
    settings.save()
}