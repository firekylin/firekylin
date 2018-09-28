import { FormComponentProps } from 'antd/lib/form';
import TwoFactorAuthStore from './two-factor-auth.store';

export interface TwoFactorAuthProps extends FormComponentProps {
    twoFactorAuthStore: TwoFactorAuthStore;
}

export interface TFAQRCodeRes {
    otpauth_url: string;
    secret: string;
}

export interface TFAQRCodeReqAuth {
    code: number;
    secret: string;
}

export interface TFAQRCodeReqSave {
    two_factor_auth: string;
}