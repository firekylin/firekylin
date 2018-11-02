import { FormComponentProps } from 'antd/lib/form';
import LDAPStore from './ldap.store';

export interface LDAPProps extends FormComponentProps {
    ldapStore: LDAPStore;
}