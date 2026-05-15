import React from 'react';
import { Form, FormInstance } from 'antd';
import { Button, Radio } from 'antd';
import BreadCrumb from '../../../components/breadcrumb';
const RadioGroup = Radio.Group;
import { OptionsExportProps, OptionsExportState } from './export.model';
import { OETypeEnum } from './export.enum';

class OptionsExportForm extends React.Component<OptionsExportProps, OptionsExportState> {
    formRef = React.createRef<FormInstance>();

    state = {
        exportType: OETypeEnum.MarkDown
    };

    render() {
        return (
            <>
                <BreadCrumb className="breadcrumb" {...this.props} />
                <div className="page-list">
                    <h3 className="page-title">导出设置</h3>
                    <div className="option-comment-page">
                        <Form ref={this.formRef} scrollToFirstError>
                            <Form.Item
                                label="请选择导出的文件类型"
                                name="push"
                                initialValue={this.state.exportType}
                            >
                                <RadioGroup
                                    onChange={e => {
                                        this.setState({exportType: e.target.value});
                                    }}
                                >
                                    <Radio value={OETypeEnum.MarkDown}>Markdown</Radio>
                                    <Radio value={OETypeEnum.Hexo}>Hexo / Jekyll</Radio>
                                    <Radio value={OETypeEnum.Hugo}>Hugo</Radio>
                                    <Radio value={OETypeEnum.WordPress}>WordPress eXtended RSS</Radio>
                                </RadioGroup>
                            </Form.Item>
                            <Form.Item>
                                <Button type="primary" href={'/admin/api/file/get?exporter=' + this.state.exportType}>下载</Button>
                            </Form.Item>
                        </Form>
                    </div>
                </div>
            </>
        );
    }
}
export default OptionsExportForm;
