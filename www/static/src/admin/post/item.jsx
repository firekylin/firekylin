
let firekylin = require('../../common/firekylin.jsx');
let {Input, Row, Col, Button, Glyphicon} = firekylin.Bootstrap;

export default firekylin.createClass({
  render(){
    return (
      <div className="post-item-container">
        <form className='form-horizontal' style={{margin: "0 15px"}}>
          <Row>
            <Col xs={6}>
              <Input type='text' addonBefore='Title' />
            </Col>
            <Col xs={6}>
              <Button bsStyle='default'><Glyphicon glyph='option-vertical' /> Options</Button>
              &nbsp;&nbsp;<Button bsStyle='primary'><Glyphicon glyph='saved' /> Save</Button>
            </Col>
          </Row>
        </form>
      </div>
    )
  }
})