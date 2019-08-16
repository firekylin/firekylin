import React, { PropsWithChildren } from 'react';
import { SpinProps } from 'antd/lib/spin';
import { Spin } from 'antd';

export default function Loading(props: PropsWithChildren<SpinProps>) {
    return <Spin>{props.children}</Spin>;
}
