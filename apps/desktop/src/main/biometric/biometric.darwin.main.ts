import { systemPreferences } from "electron";

import { I18nService } from "@bitwarden/common/abstractions/i18n.service";
import { StateService } from "@bitwarden/common/abstractions/state.service";
import { passwords } from "@bitwarden/desktop-native";

import { OsBiometricService } from "./biometrics.service.abstraction";

export default class BiometricDarwinMain implements OsBiometricService {
  constructor(private i18nservice: I18nService, private stateService: StateService) {}

  async init() {
    await this.stateService.setBiometricText("unlockWithTouchId");
    await this.stateService.setNoAutoPromptBiometricsText("autoPromptTouchId");
  }

  async osSupportsBiometric(): Promise<boolean> {
    return systemPreferences.canPromptTouchID();
  }

  async authenticateBiometric(): Promise<boolean> {
    try {
      await systemPreferences.promptTouchID(this.i18nservice.t("touchIdConsentMessage"));
      return true;
    } catch {
      return false;
    }
  }

  async getBiometricKey(service: string, key: string): Promise<string | null> {
    const success = await this.authenticateBiometric();

    if (!success) {
      throw new Error("Biometric authentication failed");
    }

    return await passwords.getPassword(service, key);
  }

  async setBiometricKey(service: string, key: string, value: string): Promise<void> {
    if (await this.valueUpToDate(service, key, value)) {
      return;
    }

    return await passwords.setPassword(service, key, value);
  }

  async deleteBiometricKey(service: string, key: string): Promise<void> {
    return await passwords.deletePassword(service, key);
  }

  private async valueUpToDate(service: string, key: string, value: string): Promise<boolean> {
    try {
      const existing = await passwords.getPassword(service, key);
      return existing === value;
    } catch {
      return false;
    }
  }
}
