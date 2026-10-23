import React from 'react';
import { Form, FormInstance } from 'antd';
import { Button, Radio } from 'antd';
import BreadCrumb from '../../../components/breadcrumb';
const RadioGroup = Radio.Group;
import { OptionsExportProps, OptionsExportState } from './export.model';
import { OETypeEnum } from './export.enum';
function OptionsExportForm(props: OptionsExportProps) {
    const [state, setState] = React.useState(() => ({
        exportType: OETypeEnum.MarkDown,
    }));
    const legacyRef = React.useRef({});
    const legacy = legacyRef.current as any;
    legacy.state = state;
    legacy.setState = (update: any, callback?: () => void) => {
        setState((previous: any) => {
            const next = {
                ...previous,
                ...(typeof update === 'function' ? update(previous, props) : update),
            };
            legacy.state = next;
            return next;
        });
        if (callback) queueMicrotask(callback);
    };
    if (!legacy.__initialized) {
        legacy.__initialized = true;
        legacy.formRef = React.createRef<FormInstance>();
    }
    legacy.render = function render() {
        return (
            <>
                <BreadCrumb className="breadcrumb" {...props} />
                <div className="page-list">
                    <h3 className="page-title">导出设置</h3>
                    <div className="option-comment-page">
                        <Form ref={legacy.formRef} layout="vertical" scrollToFirstError>
                            <Form.Item
                                label="请选择导出的文件类型"
                                name="push"
                                initialValue={legacy.state.exportType}
                            >
                                <RadioGroup
                                    onChange={(e) => {
                                        legacy.setState({ exportType: e.target.value });
                                    }}
                                >
                                    <Radio value={OETypeEnum.MarkDown}>Markdown</Radio>
                                    <Radio value={OETypeEnum.Hexo}>Hexo / Jekyll</Radio>
                                    <Radio value={OETypeEnum.Hugo}>Hugo</Radio>
                                    <Radio value={OETypeEnum.WordPress}>
                                        WordPress eXtended RSS
                                    </Radio>
                                </RadioGroup>
                            </Form.Item>
                            <Form.Item>
                                <Button
                                    type="primary"
                                    href={
                                        '/admin/api/file/get?exporter=' +
                                        legacy.state.exportType
                                    }
                                >
                                    下载
                                </Button>
                            </Form.Item>
                        </Form>
                    </div>
                </div>
            </>
        );
    };
    return legacy.render();
}

export default OptionsExportForm;
