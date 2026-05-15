import { FormComponentProps } from '@ant-design/compatible/lib/form';
import LDAPStore from './ldap.store';

export interface LDAPProps extends FormComponentProps {
    ldapStore: LDAPStore;
}