import React from 'react';
import { Form, Button, Radio } from 'antd';
import BreadCrumb from '../../../components/breadcrumb';
import RadioGroup from 'antd/lib/radio/group';
import { OptionsExportProps, OptionsExportState } from './export.model';
import { OETypeEnum } from './export.enum';
const FormItem = Form.Item;

class OptionsExportForm extends React.Component<OptionsExportProps, OptionsExportState> {

    state = {
        exportType: OETypeEnum.MarkDown
    };

    constructor(props: OptionsExportProps) {
        super(props);
    }
    
    render() {
        const { getFieldDecorator } = this.props.form;
        const url = location.protocol + '//' + location.host + '/index/contributor';
        return (
            <>
                <BreadCrumb className="breadcrumb" {...this.props} />
                <div className="page-list">
                    <h3 className="page-title">导出设置</h3>
                    <div className="option-comment-page">
                        <Form>
                            <FormItem
                                label="请选择导出的文件类型"
                            >
                                {getFieldDecorator('push', {
                                    initialValue: this.state.exportType,
                                })(
                                    <RadioGroup
                                        onChange={e => {
                                            this.setState({exportType: e.target.value});
                                        }}
                                    >
                                        <Radio value={OETypeEnum.MarkDown}>Markdown</Radio>
                                        <Radio value={OETypeEnum.Hexo}>Hexo / Jekyll</Radio>
                                        <Radio value={OETypeEnum.WordPress}>WordPress eXtended RSS</Radio>
                                    </RadioGroup>
                                )}
                            </FormItem>
                            <FormItem>
                                <Button type="primary" href={'/admin/api/file/get?exporter=' + this.state.exportType}>下载</Button>
                            </FormItem>
                        </Form>
                    </div>
                </div>
            </>
        );
    }
}
const OptionsExport = Form.create()(OptionsExportForm);
export default OptionsExport;
