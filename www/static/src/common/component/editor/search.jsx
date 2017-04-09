import React from 'react';
import Autobind from 'autobind-decorator';
import Select, {Option} from 'rc-select';
import superagent from 'superagent';
import firekylin from 'common/util/firekylin';

class Search extends React.Component {
  state = {
    options: []
  };

  fetchData(value) {
    let req = superagent.get('/admin/api/post?status=3&keyword='+encodeURIComponent(value));
    firekylin.request(req).then(
      resp => this.setState({options: resp.data})
    ).catch(() => {});
  }
  render() {
    return (
      <Select
          combobox
          style={{width: '100%'}}
          placeholder="请输入文章标题"
          notFoundContent="暂无结果"
          onChange={this.fetchData}
          onSelect={this.props.onSelect}
          filterOption={false}
          showArrow={false}
          dropdownStyle={{zIndex: 10000}}
      >
        {this.state.options.map((opt, i) =>
          <Option key={i} value={opt.pathname}>{opt.title}</Option>
        )}
      </Select>
    );
  }
}

Search.propTypes = {
  onSelect: React.PropTypes.func.isRequired
};

export default Autobind(Search);
