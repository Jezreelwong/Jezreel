import React, { Component } from 'react';
import config from "../config.json";
import $ from "jquery";
import "datatables.net-bs4/css/dataTables.bootstrap4.css";
import ServiceProviderModel from "../models/ServiceProvider";
import FormErrors from "./FormErrors";
import Validate from "./utility/FormValidation";
import Spinner from 'react-bootstrap/Spinner'
var moment = require("moment");
$.DataTable = require("datatables.net-bs4");
require("datatables.net-plugins/sorting/datetime-moment");
$.fn.dataTable.moment(config.format.datetime);
const Entities = require('html-entities').XmlEntities;
const entities = new Entities();

class ServiceProvider extends Component {
  state = {
    tableState: "All",
    data: [],
    formState: "Create",
    service: "P",
    status: "A",
    editSPId: "",
    startDate: "",
    endDate: "",
    apierrors: null,
    isLoading: true,
    errors: {
      cognito: null,
      blankfield: false,
    }
  };

  getServiceProvider = async () => {
    var url = config.api.invokeUrl + "/serviceprovider";            //change according to which api you are using
    await $.ajax({
      type: 'GET',
      url: url,
      contentType: "application/json",
      headers: {
        Authorization: JSON.parse(sessionStorage.getItem("userKeys"))["IdToken"],
      },
      success: (response) => {
        if (response["statusCode"] === 200)
          this.setState({ data: response["body"] });
      },
      error: (xhr, status, err) => {
        if(err === "Unauthorized" || xhr["status"] === 401 || xhr["status"] === 403)
          this.props.history.push("/logout");
      }
    });
  }

  toggleForm = () => {
    if (document.getElementById("FormModal").style.display === "none") {
      if (this.state.formState === "Edit") {                                    // clears form after edit
        document.getElementById("name").value = "";
        document.getElementById("startDate").value = "";
        document.getElementById("endDate").value = "";
        document.getElementById("RadioPassenger").checked = true;
        this.setState({ formState: "Create", service: "P", editSPId: "" });
      }
      document.getElementById("name").value = "";
      document.getElementById("startDate").value = "";
      document.getElementById("endDate").value = "";
      document.getElementById("FormModal").style.display = "block"
    }
    else
      document.getElementById("FormModal").style.display = "none"
  }

  closeForm = (event) => {
    if (event.target.id === "FormModal") {
      document.getElementById("FormModal").style.display = "none";
    }
  }

  toggleStatus = (event) => {
    let status = ""
    if (this.state.status === "A") {
      event.target.classList.remove("btn-outline-success");
      event.target.classList.add("btn-danger");
      event.target.innerText = "Inactive";
      status = "I";
    }
    else {
      event.target.classList.remove("btn-danger");
      event.target.classList.add("btn-outline-success");
      event.target.innerText = "Active";
      status = "A";
    }
    this.setState({ status: status })
  }

  onInputChange = event => {
    this.setState({
      [event.target.id]: event.target.value
    });
    document.getElementById(event.target.id).classList.remove("border-danger");
  };

  onRadioClick = async event => {
    await this.setState({
      service: event.target.value
    });
  }

  clearErrorState = () => {
    this.setState({
      errors: {
        cognito: null,
        blankfield: false,
      }
    });
  };

    handleSubmit = async event => {
      if (event != null)
        event.preventDefault();
      this.clearErrorState();
      document.getElementById("form-error").innerText = "";
      const error = Validate(event, this.state);
      if (error) {
        this.setState({
          errors: { ...this.state.errors, ...error }
        });
      }
      else if (this.state.name.trim() === ""){
        document.getElementById("form-error").innerText = "Name cannot be empty.";
      }
      else {
        var url = config.api.invokeUrl + "/serviceprovider";
        var ServiceProvider = new ServiceProviderModel(
          this.state.editSPId,
          entities.encode(this.state.name),
          this.state.startDate,
          this.state.endDate,
          this.state.service,
          this.props.auth.user.preferred_username,
          this.props.auth.user.preferred_username);
        let httpType = "";
        let jsonData = "";
        if (this.state.formState === "Create") {
          url += "/add"
          httpType = "PUT";
        }
        else {
          url += "/update"
          httpType = "PATCH";
        }
        jsonData = ServiceProvider.convertObjToJSON();
        await $.ajax({
          type: httpType,
          url: url,
          data: jsonData,
          contentType: "application/json",
          headers: {
            Authorization: JSON.parse(sessionStorage.getItem("userKeys"))["IdToken"],
          },
          success: (response) => {
            if (response["statusCode"] === 200) {
              window.location.reload();
            }
            else {
              console.log(response);
            }
          },
          error: (xhr, status, err) => {
            if(err === "Unauthorized" || xhr["status"] === 401 || xhr["status"] === 403)
              this.props.history.push("/logout");
          }
        });
      }
    }

  initializeTable = (data) => {
    let columns = [];
    let order = [];
    if (this.state.tableState === "All") {
      columns = [        //set header for table
        { title: "Name" },
        { title: "Start Date" },
        { title: "End Date" },
        { title: "Service Provider Type" },
        { title: "Updated By" },
        { title: "Updated Date" },
        {
          "data": null,                                                                               //add these for edit columns
          "defaultContent": "<button type='button' title='Edit' class='btn btn-link table_edit'><img alt='' src='icon_edit.png' height='25px' /></button>",
          "targets": -1
        },
      ]
      order = [[5, "desc"]];
    }
    else {
      columns = [        //set header for table
        { title: "Name" },
        { title: "Start Date" },
        { title: "End Date" },
        { title: "Updated By" },
        { title: "Updated Date" },
        {
          "data": null,                                                                               //add these for edit columns
          "defaultContent": "<button type='button' title='Edit' class='btn btn-link table_edit'><img alt='' src='icon_edit.png' height='25px' /></button>",
          "targets": -1
        },
      ]
      order = [[4, "desc"]];
    }
    $('#DataTable').DataTable({
      lengthChange: false,                  //data1       data2
      data: data,       //data must be in [ [col1,col2], [col1,col2] ] format
      "createdRow": function (row, data, dataIndex) {
        $(row).attr('id', data[6]);
      },
      columns: columns,
      order: order,
      "initComplete": () => {
        $("#DataTable_filter label").contents().filter(function () {    //styling seachbar
          return this.nodeType === 3;
        }).remove()
        let searchbar = document.querySelector("#DataTable_filter label input");
        let searchbarDiv = document.getElementById("DataTable_filter");
        searchbar.setAttribute("placeholder", "Search Service Provider");           //set searchbarplaceholder
        searchbar.classList.remove("form-control-sm");
        searchbar.classList.add("ml-0");
        searchbar.style.width = "100%";
        searchbar.parentElement.style.width = "95%";
        searchbar.parentElement.style.marginBottom = "0";
        searchbarDiv.parentElement.classList.remove("col-md-6");
        searchbarDiv.classList.add("d-flex");
        let newBtn = document.createElement("Button");
        newBtn.setAttribute("onClick", "document.getElementById('addData').click();");
        newBtn.setAttribute("class", "btn btn-primary btn-circle ml-3");
        newBtn.innerHTML = '<span title="Add"><i class="fas fa-plus"></i></span>';
        searchbarDiv.appendChild(newBtn)
        let newDiv = document.createElement("Div");
        newDiv.setAttribute("class", "col-12 col-md-10 col-lg-8 mt-4");     //need to add the codes below based on how many table tabs you have. edit the value and text according to your table state
        if (this.state.tableState === "All") {                          //eg users page has 4 tabs so 4 ifs statement and 4 button divs, annoucements has 2 tabs so 2 ifs and 2 button divs
          newDiv.innerHTML = `<div class="row mt-2 ml-0 mr-0">` +
            `<div class="col-3 table-btn-selected"><p>All</p></div>` +
            `<div class="col-3 table-btn" onclick="document.getElementById('changeTable').value='P';document.getElementById('changeTable').click();"><p>Passenger</p></div>` +
            `<div class="col-3 table-btn" onclick="document.getElementById('changeTable').value='RPL';document.getElementById('changeTable').click();"><p>RPL</p></div>` +
            `</div>`;
        }
        else if (this.state.tableState === "P") {
          newDiv.innerHTML = `<div class="row mt-2 ml-0 mr-0">` +
            `<div class="col-3 table-btn" onclick="document.getElementById('changeTable').value='All';document.getElementById('changeTable').click();"><p>All</p></div>` +
            `<div class="col-3 table-btn-selected"><p>Passenger</p></div>` +
            `<div class="col-3 table-btn" onclick="document.getElementById('changeTable').value='RPL';document.getElementById('changeTable').click();"><p>RPL</p></div>` +
            `</div>`;
        }
        else if (this.state.tableState === "RPL") {
          newDiv.innerHTML = `<div class="row mt-2 ml-0 mr-0">` +
            `<div class="col-3 table-btn" onclick="document.getElementById('changeTable').value='All';document.getElementById('changeTable').click();"><p>All</p></div>` +
            `<div class="col-3 table-btn" onclick="document.getElementById('changeTable').value='P';document.getElementById('changeTable').click();"><p>Passenger</p></div>` +
            `<div class="col-3 table-btn-selected"><p>RPL</p></div>` +
            `</div>`;
        }
        searchbarDiv.parentElement.parentElement.appendChild(newDiv);
        searchbarDiv.parentElement.parentElement.classList.add("ml-0", "mr-0", "tab-border");
        searchbarDiv.parentElement.parentElement.nextSibling.classList.add("overflow-data-table");
        let listOfDivs = searchbarDiv.parentElement.parentElement.childNodes;
        for (var i = 0; i < listOfDivs.length; i++) {
          listOfDivs[i].classList.add("pl-0", "pr-0");
        }
      }
    });
  }

  formatData = async (tableState) => {
    let data = [];
    let condition = "";
    if (tableState !== "All")
      condition = "tableState";
    for (var i = 0; i < this.state.data.length; i++) {
      let serviceprovider = ""
      let date = new Date(this.state.data[i]["updatedDate"]);
      date.setHours(date.getHours() - 8)
      if (condition === "") {
        let service = this.state.data[i]["serviceProviderType"] === "P" ? "Passenger" : this.state.data[i]["serviceProviderType"];
        serviceprovider = [this.state.data[i]["name"], moment(this.state.data[i]["startDate"]).format(config.format.date), moment(this.state.data[i]["endDate"]).format(config.format.date), service, this.state.data[i]["updatedBy"], moment(date).format(config.format.datetime), this.state.data[i]["spId"]];
      }
      else {
        let serviceProvider = this.state.data[i]["serviceProviderType"].split(";");
        if (serviceProvider.includes(tableState))
          serviceprovider = [this.state.data[i]["name"], moment(this.state.data[i]["startDate"]).format(config.format.date), moment(this.state.data[i]["endDate"]).format(config.format.date), this.state.data[i]["updatedBy"], moment(date).format(config.format.datetime), "", this.state.data[i]["spId"]];
      }
      if (serviceprovider !== "")
        data.push(serviceprovider);
    }
    return data
  }

  setEditClick = () => {
    $('#DataTable').on('click', 'button.table_edit', async (event) => {                               //add click event listener function for edit
      let rowId = $(event.target).closest('tr').attr('id');
      let editData = "";
      for (var i = 0; i < this.state.data.length; i++) {
        if (parseInt(rowId) === this.state.data[i]["spId"]) {
          editData = this.state.data[i];
          break;
        }
      }
      if (editData !== "") {                                                          //set default values to the edit form
        await this.setState({
          formState: "Edit",
          editSPId: editData["spId"],
          service: editData["serviceProviderType"],
          name: editData["name"],
          startDate: editData["startDate"],
          endDate: editData["endDate"]
        });
        let sdate = new Date(this.state.data[i]["startDate"]);
        let edate = new Date(this.state.data[i]["endDate"]);
        document.getElementById("name").value = entities.decode(editData["name"]);
        document.getElementById("startDate").value = moment(sdate).format("YYYY-MM-DD");
        document.getElementById("endDate").value = moment(edate).format("YYYY-MM-DD");
        if (editData["serviceProviderType"] === "RPL")
          document.getElementById("RadioRPL").checked = true;
        else
          document.getElementById("RadioPassenger").checked = true;
        document.getElementById("FormModal").style.display = "block";
      }
    });
  }

  changeTable = async () => {
    let data = [];
    let newTableState = document.getElementById("changeTable").value;           //set which data display on which state
    data = await this.formatData(newTableState);
    await this.setState({
      tableState: newTableState
    });
    try {
      $('#DataTable').DataTable().destroy(true)
    }
    catch (e) {
      console.log(e)
    }
    document.querySelector(".data-table-div").innerHTML = '<table id="DataTable" class="data-table" width="100%"></table>';
    this.initializeTable(data);
    this.setEditClick();
  }

  async componentDidMount() {
    this.props.auth.setNav("ServiceProvider");                    //set change this according to the value in Navbar.js If dk just ask me.
    await this.getServiceProvider();
    let data = await this.formatData(this.state.tableState);
    await this.initializeTable(data);
    this.setEditClick();
    this.setState({ isLoading: false });
  }

  async componentWillUnmount() {
    try {
      $('#DataTable').DataTable().destroy(true)
    }
    catch (e) {
      console.log(e)
    }
  }

  render() {
    if (!this.props.auth.isAuthenticated) {
      this.props.history.push("/logout");
      return (<div></div>);
    }
    else {
      return (
        <div className="container-fluid p-0">
          <script>{document.body.style.backgroundColor = "#EEEEEE"})
            </script>
          <div className="row p-3 mr-0" id="main-content">
            <p className="table-title">MANAGE SERVICE PROVIDER</p>
            <input onClick={this.toggleForm} type="hidden" id="addData" />
            <input onClick={this.changeTable} type="hidden" id="changeTable" />
            <div className="data-div shadow bg-white">
              <div className="data-table-div m-3">
                <table id="DataTable" className="data-table" width="100%"></table>
              </div>
              {this.state.isLoading && (<div className="text-center m-3">
                <Spinner animation="border" role="status">
                  <span className="sr-only">Loading...</span>
                </Spinner>
              </div>)}
            </div>

            <div className="form-modal" onClick={this.closeForm} style={{ display: "none" }} id="FormModal">
              <form autoComplete="off" onSubmit={this.handleSubmit} className="form-content animate pl-3 pr-3">
                <span onClick={this.toggleForm} className="close-form" title="Close Modal">&times;</span>
                <div className="form-title-div mb-2">
                  <h5>{(this.state.formState === "Create") ? "Create A New " : "Edit "}Service Provider</h5>
                </div>
                <div id="form-error" className="form-errors text-center"></div>
                <FormErrors formerrors={this.state.errors} />
                <div className="row">
                  <div className="col-12">
                    <div className="form-group">
                      <label htmlFor="name">Name:</label>
                      <input className="form-control" onChange={this.onInputChange} required type="text" id="name" />
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="form-group">
                      <label htmlFor="startDate">Start Date:</label>
                      <input className="form-control" onChange={this.onInputChange} required type="date" id="startDate" />
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="form-group">
                      <label htmlFor="endDate">End Date:</label>
                      <input className="form-control" onChange={this.onInputChange} required type="date" id="endDate" />
                    </div>
                  </div>
                  <div className="col-12 col-md-4">
                    <label> Service Provider Type:</label>
                  </div>
                  <div className="col-6 col-md-4">
                    <div className="custom-control custom-radio">
                      <input className="custom-control-input" onClick={this.onRadioClick} type="radio" name="inlineRadioOptions" id="RadioPassenger" defaultChecked value="P" />
                      <label className="custom-control-label" htmlFor="RadioPassenger">Passenger</label>
                    </div>
                  </div>
                  <div className="col-6 col-md-4 mb-3">
                    <div className="custom-control custom-radio">
                      <input className="custom-control-input" onClick={this.onRadioClick} type="radio" name="inlineRadioOptions" id="RadioRPL" value="RPL" />
                      <label className="custom-control-label" htmlFor="RadioRPL">RPL</label>
                    </div>
                  </div>
                </div>
                <div className="row" style={{ backgroundColor: "#f1f1f1" }}>
                  <div className="col-12 col-sm-6 col-md-4 col-lg-3 ml-auto mb-2 mt-2"><button type="reset" className="btn btn-block btn-outline-danger">Clear <i className="far fa-window-close"></i></button></div>
                  {(this.state.formState === "Create")
                    ? <div className="col-12 col-sm-6 col-md-4 col-lg-3 mb-2 mt-2"><button type="submit" className="btn btn-block btn-success">Create <i className="far fa-plus-square"></i></button></div>
                    : <div className="col-12 col-sm-6 col-md-4 col-lg-3 mb-2 mt-2"><button type="submit" className="btn btn-block btn-outline-primary">Update <i className="fas fa-edit"></i></button></div>}
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }
  }
}

export default ServiceProvider;