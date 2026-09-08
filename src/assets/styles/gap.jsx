import React, { Component } from 'react';
import { Link } from "react-router-dom";

import { connect } from 'react-redux';
import { Paging } from 'actions/paging';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableSortLabel from '@mui/material/TableSortLabel';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TablePagination from '@mui/material/TablePagination';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import Checkbox from '@mui/material/Checkbox';
import Menu from '@mui/material/Menu';
import Popover from '@mui/material/Popover';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';

import Clear from '@mui/icons-material/Clear';
import ExpandMore from '@mui/icons-material/ExpandMore';
import CalendarToday from '@mui/icons-material/CalendarToday';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlank from '@mui/icons-material/CheckBoxOutlineBlank';
import FilterList from '@mui/icons-material/FilterList';
import Close from '@mui/icons-material/Close';

import DateHelper from 'helpers/DateHelper';
import NoData from 'components/blocks/NoData';
import Btn from 'components/Btn';
import EditableCell from './EditableCell';
import Api from 'api/Api';

const CELL_RESET = {
    padding: '26px 20px',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '13px',
    fontFamily: 'inherit',
    color: '#1e293b',
    background: '#ffffff',
};

const HEAD_CELL = {
    padding: '26px 20px',
    backgroundColor: 'transparent',
    color: '#434652B2',
    fontWeight: 600,
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '.08em',
    borderBottom: 'none',
    fontFamily: 'inherit',
};

class DataTable extends Component {

    constructor(props) {
        super();

        this.state = {

            page: 0,

            loading: true,
            fadeOut: false,
            show_loader: false,

            hide_search: false,

            per_page: 10,
            total_records: 0,

            data: [],

            no_data: false,

            column_sort_by: null,
            sort_by_dir: 'desc',

            search: {},

            range_popover: false,

            range_init: false,
            range_start: false,
            range_end: false,
            range_selected_column: false,

            main_checked: false,
            select_all: false,
            checked_rows: [],
            checked_rows_data: [],

            bulk_action: false,
            selected_bulk_action: "",

            bulk_selection: false,

            selected_row_index: false,
            selected_row_data: false,

            editable_cell: false,

            applied_tabbed_filters: [],

            active_tab: '**'
        }

        this.search_interval = null;
    }

    componentDidMount = () => {

        if(this.getTableIndex('page')){

            let page = this.getTableIndex('page');

            this.setState({page: page});
        }

        if(this.getTableIndex('per_page')){

            let per_page = this.getTableIndex('per_page');

            this.setState({per_page: per_page});
        }

        if(this.getTableIndex('search') !== false){

            let search_values = {};

            let _search = this.getTableIndex('search');

            _search = JSON.parse(_search);

            if(Object.keys(_search).length > 0){

                for(let _s in _search){

                    search_values[_s] = _search[_s]['keyword']
                }

                this.setState({search_values: search_values, search: _search});
            }
        }

        var page = this.state.page;
        var per_page = this.state.per_page;

        var paging = this.props.paging;

        if(this.props.index && paging.hasOwnProperty(this.props.index)){

            if(paging[this.props.index].hasOwnProperty('page')){

                page = paging[this.props.index]['page'];
                this.setState({page: page});
            }

            if(paging[this.props.index].hasOwnProperty('per_page')){

                per_page = paging[this.props.index]['per_page'];
                this.setState({per_page: per_page});
            }
        }

        if(this.props.per_page){

            this.setState({per_page: this.props.per_page})
        }

        let applied_tabbed_filters = this.tabbedFilters()

        let active_tab = applied_tabbed_filters.default_active_tab;

        if(active_tab.hasOwnProperty('default')){
        
            if(active_tab.default === ''){

                this.setState({active_tab: '**'})
            }else{

                this.setState({active_tab: active_tab.default})
            }
        }

        if(this.props.default_sort_by){

            this.setState({column_sort_by: this.props.default_sort_by});

            if(this.props.sort_by_dir && (this.props.sort_by_dir === 'asc' || this.props.sort_by_dir === 'desc')){

                this.setState({sort_by_dir: this.props.sort_by_dir})
            }

            this.setState({applied_tabbed_filters: applied_tabbed_filters.applied_tabbed_filters})

            var that = this;

            window.setTimeout(() => {
                
                that.loadData(that.state.page, that.props.account_token, false, true);

            }, 500);
            
        }else{

            this.setState({applied_tabbed_filters: applied_tabbed_filters.applied_tabbed_filters}, () => {

                this.loadData(this.state.page, this.props.account_token, false, true);
            })
        }
    }

    componentDidUpdate = (prevProps, prevState, snapshot) => {

        if(
            this.props.do_reload
            &&
            this.props.do_reload !== prevProps.do_reload
            &&
            this.props.do_reload === true
        ){

            this.loadData(this.state.page, this.props.account_token, false, false);
        }

        if(
            this.props.close_bulk_action
            &&
            this.props.close_bulk_action !== prevProps.close_bulk_action
            &&
            this.props.close_bulk_action === true
        ){

            this.setState({bulk_action: false, select_all: false, main_checked: false})
            this.props.onBulkActionClose();
            this.unCheckAll();
        }
    }

    componentWillUnmount = () => {

        clearTimeout(this.search_interval);

        // Reset page to 0 so the next DataTable with this index always opens on page 1
        if (this.props.index) {

            this.setTableIndex('page', 0);

            var paging = this.props.paging;

            if (paging.hasOwnProperty(this.props.index)) {

                paging[this.props.index]['page'] = 0;
                this.props.Paging(paging);
            }
        }
    }

    updatePage = (_props) => {

        var paging = this.props.paging;
        
        if(this.props.index){

            if(!paging.hasOwnProperty(this.props.index)){

                paging[this.props.index] = {};
            }
            
            if(_props.hasOwnProperty('page')){
            
                paging[this.props.index]['page'] = _props.page;

                this.setTableIndex('page', _props.page)
            }

            if(_props.hasOwnProperty('per_page')){
            
                paging[this.props.index]['per_page'] = _props.per_page;

                this.setTableIndex('per_page', _props.per_page)
            }
            
            this.props.Paging(paging);
        }
    }

    bulkActionTitle = () => {

        if(this.state.selected_bulk_action){

            const _action = this.props.bulk_actions.find(a => a.key === this.state.selected_bulk_action);
            
            if(_action){

                return _action.title;
            }
        }

        if(this.state.select_all){

            return <span>Bulk Actions <span className="opacity-60">({this.state.total_records} selected)</span></span>
        }else{
        
            return this.state.checked_rows.length > 0 ? <span>Bulk Actions <span className="opacity-60">({this.state.checked_rows.length} selected)</span></span> : "Bulk Actions";
        }
    }

    tabbedFilters = () => {

        let applied_tabbed_filters = [];
        let default_active_tab = {};

        let tabbed_filters = this.props.tabbed_filters;

        if(tabbed_filters && tabbed_filters.hasOwnProperty('filters')){

            tabbed_filters.filters.map((_tabbed_filters) => {

                if(_tabbed_filters.hasOwnProperty('default') && _tabbed_filters.default !== ''){

                    default_active_tab['tab'] = _tabbed_filters.key
                    default_active_tab['default'] = _tabbed_filters.default;

                    applied_tabbed_filters.push({key: _tabbed_filters.key, value: _tabbed_filters.default})
                }
            })
        }

        return {applied_tabbed_filters: applied_tabbed_filters, default_active_tab: default_active_tab}
    }

    renderTabbedFilters = () => {

        let tabbed_filters = this.props.tabbed_filters;

        if(tabbed_filters && tabbed_filters.hasOwnProperty('filters') && tabbed_filters.filters.length > 0){

            if(tabbed_filters.hasOwnProperty('type') && tabbed_filters.type === 'tabs'){

                return (
                    <div className="flex flex-wrap gap-1 mb-6 bg-[#edf2f7]/60 p-1.5 rounded-2xl w-max">
                        {tabbed_filters.filters.map((_tabbed_filter, index) => {

                            let _options = [];

                            if(_tabbed_filter.hasOwnProperty('hide_all') && _tabbed_filter.hide_all === true){

                            }else{

                                _options.push({key: '**', value: 'All Shipment'})
                            }

                            if(_tabbed_filter.hasOwnProperty('options') && _tabbed_filter.options.length > 0){

                                _options = [..._options, ..._tabbed_filter.options];
                            }

                            return _options.map((_option, _index) => {

                                const active = this.state.active_tab === _option.key;

                                return (
                                    <button
                                        key={`tabbed_filter_tab_option_${_index}_${index}`}
                                        onClick={() => {

                                            let applied_tabbed_filters = this.state.applied_tabbed_filters;

                                            this.setState({active_tab: _option.key})

                                            if(this.props.activeTab){

                                                this.props.activeTab(_option.key)
                                            }

                                            const _applied = applied_tabbed_filters.findIndex(row => row.key === tabbed_filters.filters[0]['key']);

                                            if(_applied > -1){

                                                applied_tabbed_filters[_applied]['value'] = _option.key
                                            }else{

                                                applied_tabbed_filters.push({key: tabbed_filters.filters[0]['key'], value: _option.key})
                                            }

                                            this.setState({applied_tabbed_filters: applied_tabbed_filters}, () => {

                                                if(this.props.onTabClick){

                                                    this.props.onTabClick(_option.key)
                                                }

                                                this.loadData(0, this.props.account_token, true);
                                            })
                                        }}
                                        className={`px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${active
                                            ? 'bg-white text-[#013178] shadow-sm'
                                            : 'text-[#424752] hover:text-[#0f2942]'
                                        }`}
                                    >
                                        {_option.value}
                                    </button>
                                )
                            })
                        })}
                    </div>
                )
            }

            let filters = [];

            tabbed_filters.filters.map((_tabbed_filter, index) => {

                let _filter_options = [];

                let _options = [];

                if(_tabbed_filter.hasOwnProperty('options') && _tabbed_filter.options.length > 0){

                    _options = [..._options, ..._tabbed_filter.options];
                }

                _options.map((_option, _index) => {

                    _filter_options.push(
                        <Chip
                            key={`tabbed_filter_option_${_index}_${index}_${_tabbed_filter.key}`}
                            size="small"
                            label={
                                <div className="flex items-center gap-1">
                                    <span className="text-[11px] font-semibold">{_option.value}</span>
                                    {this.inAppliedTabbedFilters(_tabbed_filter.key, _option.key) === 'primary' && (
                                        <span className="ml-1 w-3.5 h-3.5 rounded-full p-0.5 bg-black/20 flex items-center justify-center">
                                            <Close style={{ fontSize: 12 }} />
                                        </span>
                                    )}
                                </div>
                            }
                            color={this.inAppliedTabbedFilters(_tabbed_filter.key, _option.key)}
                            onClick={() => {

                                let applied_tabbed_filters = this.state.applied_tabbed_filters;

                                const _applied = applied_tabbed_filters.findIndex(row => row.key === _tabbed_filter.key);

                                if(_applied > -1){

                                    if(applied_tabbed_filters[_applied]['value'].indexOf(_option.key) > -1){

                                        applied_tabbed_filters[_applied]['value'].splice(applied_tabbed_filters[_applied]['value'].indexOf(_option.key), 1)

                                        if(applied_tabbed_filters[_applied]['value'].length <= 0){

                                            applied_tabbed_filters.splice(_applied, 1);
                                        }
                                    }else{

                                        applied_tabbed_filters[_applied]['value'].push(_option.key)
                                    }
                                }else{

                                    applied_tabbed_filters.push({key: _tabbed_filter.key, value: [_option.key]})
                                }

                                this.setState({applied_tabbed_filters: applied_tabbed_filters}, () => {

                                    this.loadData(0, this.props.account_token, true);
                                })
                            }}
                        />
                    );
                })

                filters.push(

                    <ul key={`tabbed_filter_${index}_${_tabbed_filter.key}`} className="mb-4 list-none p-0">

                        <li className="flex items-center gap-2">

                            <strong className="text-xs font-bold text-[#475569]">{_tabbed_filter.label}</strong>

                            <Stack direction="row" spacing={1}>{_filter_options}</Stack>
                            
                            {this.tabbedFilterClearButton(_tabbed_filter.key)}
                        </li>
                    </ul>
                );
            })

            return filters
        }
    }

    tabbedFilterClearButton = (key) => {

        let applied_tabbed_filters = this.state.applied_tabbed_filters;

        const _applied = applied_tabbed_filters.findIndex(row => row.key === key);

        if(_applied > -1){

            return (
                <Btn
                    className="ml-2"
                    size="small"
                    type="button"
                    icon={true}
                    onClick={() => {

                        applied_tabbed_filters.splice(_applied, 1);

                        this.setState({applied_tabbed_filters: applied_tabbed_filters}, () => {

                            this.loadData(0, this.props.account_token, true);
                        })
                    }}
                >
                    <Close style={{ fontSize: 14 }} />
                </Btn>
            )
        }
        
        return null;
    }

    inAppliedTabbedFilters = (filter_key, option_key) => {

        let applied_tabbed_filters = this.state.applied_tabbed_filters;

        const _applied = applied_tabbed_filters.find(row => row.key === filter_key);

        if(_applied && _applied.value.indexOf(option_key) > -1){

            return 'primary'
        }

        return 'default'
    }

    renderToolbarActions = () => {

        if(!this.props.toolbar_actions) return null;

        return this.props.toolbar_actions.map((_ta, idx) => {

            let props = {};

            if(_ta.startIcon) props.startIcon = _ta.startIcon;
            if(_ta.endIcon) props.endIcon = _ta.endIcon;
            if(_ta.to) props.to = _ta.to;
            if(_ta.onClick) props.onClick = _ta.onClick;

            return (
                <Btn {...props} key={`ta_${idx}`} color="primary" variant="outlined" size="small" className="ml-2">
                    {_ta.label}
                </Btn>
            );
        });
    }

    render() {
        const { page, per_page, total_records } = this.state;
        const from = total_records === 0 ? 0 : page * per_page + 1;
        const to = Math.min((page + 1) * per_page, total_records);
        const hasPrev = page > 0;
        const hasNext = (page + 1) * per_page < total_records;

        return (
            <div>

                {this.renderTabbedFilters()}

                {this.props.beforeUpperToolbar}

                {!this.props.hide_upper_toolbar && (

                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            {this.props.bulk_actions && (
                                <>
                                    <Button
                                        disabled={this.state.checked_rows_data.length === 0}
                                        variant="outlined"
                                        size="small"
                                        endIcon={<ExpandMore sx={{ fontSize: 14 }} />}
                                        onClick={(e) => this.setState({ bulk_action: e.currentTarget })}
                                    >
                                        {this.bulkActionTitle()}
                                    </Button>
                                    <Menu
                                        id="bulk-actions"
                                        anchorEl={this.state.bulk_action}
                                        keepMounted
                                        open={Boolean(this.state.bulk_action)}
                                        onClose={() => {
                                            this.setState({ bulk_action: false, main_checked: false, select_all: false });
                                            this.props.onBulkActionClose();
                                            this.unCheckAll();
                                        }}
                                    >
                                        {this.props.bulk_actions}
                                    </Menu>
                                </>
                            )}

                            <Menu
                                id="bulk-selection"
                                anchorEl={this.state.bulk_selection}
                                keepMounted
                                open={Boolean(this.state.bulk_selection)}
                                onClose={() => this.setState({ bulk_selection: false })}
                            >
                                <MenuItem key="select_visible" value="select_visible" style={{ padding: 0 }}>
                                
                                    <FormControlLabel
                                        style={{ padding: 5, width: '100%', margin: 0 }}
                                        label={<span className="mr-10 text-xs">Select Visible</span>}
                                        control={
                                            <Checkbox
                                                color="primary"
                                                size="small"
                                                checked={this.state.main_checked}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        this.checkAll();
                                                        this.setState({ main_checked: true, select_all: false, bulk_selection: false });
                                                    } else {
                                                        this.setState({ checked_rows: [], checked_rows_data: [], main_checked: false, bulk_selection: false });
                                                    }
                                                    if (this.props.onSelectAll) this.props.onSelectAll(false, {});
                                                }}
                                            />
                                        }
                                    />
                                </MenuItem>

                                <MenuItem key="select_all" value="select_all" style={{ padding: 0 }}>

                                    <FormControlLabel
                                        style={{ padding: 5, width: '100%', margin: 0 }}
                                        label={<span className="mr-10 text-xs">Select All</span>}
                                        control={
                                            <Checkbox
                                                color="primary"
                                                size="small"
                                                checked={this.state.select_all}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        this.checkAll();
                                                        this.setState({ select_all: true, main_checked: false, bulk_selection: false });
                                                        if (this.props.onSelectAll) this.props.onSelectAll(true, this.state.search);
                                                    } else {
                                                        this.setState({ checked_rows: [], checked_rows_data: [], select_all: false, bulk_selection: false });
                                                        if (this.props.onSelectAll) this.props.onSelectAll(false, {});
                                                    }
                                                }}
                                            />
                                        }
                                    />
                                </MenuItem>
                            </Menu>

                            <div className="flex items-center gap-3 bg-white border border-[#edf2f7] rounded-xl px-5 py-3">

                                <div className="p-2 bg-[#edf2f7] rounded-lg text-[#2563eb] flex items-center justify-center">
                                    <FormatListBulletedIcon sx={{ fontSize: 16 }} />
                                </div>

                                <div className="leading-tight">
                                    <p className="text-[10px] font-normal text-[#45464D99] uppercase tracking-wider mb-1">Total Records</p>
                                    <p className="font-semibold text-[#1e293b]">{total_records} Active</p>
                                </div>

                            </div>
                        </div>

                        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-[#edf2f7] shadow-sm">

                            {this.renderToolbarActions()}

                            <div className="flex items-center gap-2 border-r border-[#edf2f7] pr-4">

                                <span className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider">Display:</span>

                                <div className="relative">
                                    <select
                                        value={this.state.per_page}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            this.setState({ per_page: val, page: 0 }, () => {
                                                this.updatePage({ page: 0, per_page: val });
                                                this.loadData(0, this.props.account_token, true);
                                            });
                                        }}
                                        className="appearance-none rounded-lg pl-4 pr-5 py-1 text-xs font-bold text-[#475569] cursor-pointer focus:outline-none hover:border-[#cbd5e1]"
                                    >
                                        {[10, 20, 50, 100].map(n => (
                                            <option key={n} value={n}>{n}</option>
                                        ))}
                                    </select>

                                    <svg className="pointer-events-none absolute right-2 mt-0.5 top-1/2 -translate-y-1/2" width="10" height="10" viewBox="0 0 10 10" fill="none">
                                        <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>

                            <span className="text-xs font-semibold whitespace-nowrap">

                                <span className="text-[#64748b]">{from}–{to}</span>
                                <span className="text-[#cbd5e1] ml-1">of {total_records}</span>

                            </span>

                            <div className="flex items-center gap-1">

                                <button
                                    disabled={!hasPrev}
                                    onClick={() => {
                                        const p = page - 1;
                                        this.setState({ page: p }, () => {
                                            this.updatePage({ page: p });
                                            this.loadData(p, this.props.account_token, true);
                                        });
                                    }}
                                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${hasPrev ? 'text-[#64748b] hover:bg-[#f8fafc] bg-white' : 'text-[#cbd5e1] cursor-not-allowed'}`}
                                >
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                        <path d="M8.5 10.5L5 7L8.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>

                                <button
                                    disabled={!hasNext}
                                    onClick={() => {
                                        const p = page + 1;
                                        this.setState({ page: p }, () => {
                                            this.updatePage({ page: p });
                                            this.loadData(p, this.props.account_token, true);
                                        });
                                    }}
                                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${hasNext ? 'text-[#64748b] hover:bg-[#f8fafc] bg-white' : 'text-[#cbd5e1] cursor-not-allowed'}`}
                                >
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                        <path d="M5.5 3.5L9 7L5.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {this.props.afterUpperToolbar}

                {this.state.checked_rows.length > 0 && (

                    <div className="flex items-center gap-3 px-4 py-2.5 mb-4 bg-blue-50 rounded-xl border border-blue-100 shadow-sm">

                        <span className="text-xs font-bold text-blue-700">{this.state.checked_rows.length} record(s) selected</span>

                        <button
                            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-semibold transition-colors"
                            onClick={() => {
                                this.setState({ checked_rows: [], checked_rows_data: [], select_all: false, bulk_selection: false, main_checked: false });
                                if (this.props.onSelectAll) this.props.onSelectAll(false, {});
                                if (this.props.onRowCheck) this.props.onRowCheck([]);
                            }}
                        >
                            <Clear sx={{ fontSize: 14 }} /> Clear
                        </button>

                    </div>
                )}

                {this.state.loading ? (

                    this.renderSkeleton()
                ) : this.props.list_component ? (

                    <Grid
                        container
                        spacing={this.props.list_component_spacing ? this.props.list_component_spacing : 5}
                    >
                        {this.renderListComponent()}
                    </Grid>

                ) : (
                    <div className="relative">

                        <TableContainer className="rounded-2xl border border-[#edf2f7] bg-transparent shadow-sm overflow-hidden">

                            <Table aria-label="data table" sx={{ minWidth: 600, borderCollapse: 'collapse' }}>

                                <TableHead className="bg-[#f8fafc] border-b border-[#edf2f7]">
                                    {this.renderHeaders()}
                                </TableHead>

                                <TableBody className="bg-transparent">
                                    {!this.props.hide_search_bar && !this.state.hide_search && this.renderSearchRow()}
                                    {this.state.no_data ? this.noData() : this.renderData()}
                                </TableBody>

                            </Table>

                            {!this.props.hide_bottom_toolbar && (

                                <div className="flex items-center justify-end gap-3 px-5 py-2 border-t border-[#edf2f7] bg-[#F8FAFC80]">

                                    <button
                                        disabled={!hasPrev}
                                        onClick={() => {
                                            const p = page - 1;
                                            this.setState({ page: p }, () => {
                                                this.updatePage({ page: p });
                                                this.loadData(p, this.props.account_token, true);
                                            });
                                        }}
                                        className={`w-8 h-8 rounded-xl border flex items-center justify-center ${hasPrev ? 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50' : 'border-slate-100 bg-slate-50 text-slate-200 cursor-not-allowed'}`}
                                    >

                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                            <path d="M14 6L8 12L14 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>

                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-[700] text-slate-900">{page + 1}</span>
                                        <span className="text-[10px] font-[600] text-slate-300">/</span>
                                        <span className="text-[10px] font-[700] text-slate-400">{Math.ceil(total_records / per_page) || 1}</span>
                                    </div>
                                    <button
                                        disabled={!hasNext}
                                        onClick={() => {
                                            const p = page + 1;
                                            this.setState({ page: p }, () => {
                                                this.updatePage({ page: p });
                                                this.loadData(p, this.props.account_token, true);
                                            });
                                        }}
                                        className={`w-8 h-8 rounded-xl border flex items-center justify-center ${hasNext ? 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50' : 'border-slate-100 bg-slate-50 text-slate-200 cursor-not-allowed'}`}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                            <path d="M10 6L16 12L10 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                </div>
                            )}

                        </TableContainer>

                        {this.state.show_loader && (
                            <div
                                className="absolute left-0 w-full z-[999] flex items-start justify-center"
                                style={{ top: 60, height: 'calc(100% - 60px)', backgroundColor: 'rgba(255,255,255,0.6)' }}
                            >
                                <div className="mt-8 flex flex-col items-center gap-2">
                                    <CircularProgress size={36} sx={{ color: '#0f2942' }} />
                                    <strong className="text-xs text-[#0f2942]">Loading</strong>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <Popover
                    onClose={() => this.setState({ range_popover: false })}
                    open={!!this.state.range_popover}
                    anchorEl={this.state.range_popover}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    PaperProps={{ sx: { borderRadius: 3, boxShadow: '0 10px 40px rgba(0,0,0,.12)' } }}
                >
                    <div className="w-[360px] p-5">
                        {this.renderDateRangeView()}
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DateCalendar
                                minDate={this.minDate()}
                                value={this.state.range_start !== false ? this.state.range_start : null}
                                onChange={(e) => {
                                    if (this.state.range_init) {
                                        this.setState({ range_start: e, range_init: false });
                                    } else {
                                        this.setState({ range_end: e, range_popover: false }, () =>
                                            this.gridSearch(this.state.range_selected_column, [this.state.range_start, this.state.range_end])
                                        );
                                    }
                                }}
                            />
                        </LocalizationProvider>
                    </div>
                </Popover>

            </div>
        );
    }

    renderDateRangeView = () => {

        if (this.state.range_start !== false) {
            return (
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-700">
                        {DateHelper.formattedDate(new Date(this.state.range_start))}
                        {' – '}
                        {this.state.range_end !== false && DateHelper.formattedDate(new Date(this.state.range_end))}
                    </span>
                    <button
                        className="p-1 rounded-full hover:bg-red-50 text-red-400 transition-colors"
                        onClick={() => {
                            this.gridSearch(this.state.range_selected_column, '');
                            this.setState({ range_start: false, range_end: false, range_selected_column: false, range_popover: false });
                            window.setTimeout(() => this.loadData(0, this.props.account_token, false, true), 200);
                        }}
                    >
                        <Clear sx={{ fontSize: 14 }} />
                    </button>
                </div>
            )
        }

        return null;
    }

    minDate = () => {

        if (this.state.range_init) { 
            const d = new Date(); 
            d.setFullYear(d.getFullYear() - 5); 
            return d; 
        }

        return new Date(this.state.range_start);
    }

    noData = () => {

        return (
            <TableRow>
                <TableCell colSpan={(this.props.columns.length) + 1} sx={{ ...CELL_RESET, textAlign: 'center', py: 8 }}>
                    <NoData size="small" message={this.props.label ? this.props.label + ' not found!' : 'Records not found!'} />
                </TableCell>
            </TableRow>
        )
    }

    renderHeaders = () => {

        const columns = this.props.columns;

        if (!columns.length) return null;

        return (
            <TableRow>
                {columns.map((col, i) =>
                    col && typeof col === 'object' && col.hasOwnProperty('column')
                        ? this.renderHeaderCell(col, i)
                        : null
                )}
                <TableCell sx={{ ...HEAD_CELL, textAlign: 'right' }}>Actions</TableCell>
            </TableRow>
        );
    }

    renderSearchRow = () => {

        const columns = this.props.columns;

        return (
            <TableRow className="bg-[#f8fafc]/40 border-b border-[#edf2f7]">

                {columns.map((col, idx) => {
                    if (!col || typeof col !== 'object' || !col.hasOwnProperty('column')) return null;
                    if (col.selectable) return <TableCell key={`search_sel_${idx}`} sx={{ padding: '1px 1px', borderBottom: 'none' }} />;
                    
                    return (

                        <TableCell key={`search_${idx}`} sx={{ padding: '0px 0px', borderBottom: 'none' }} align={col.align ?? 'left'}>
                            {col.searchable && (
                                <div className="relative w-full max-w-[200px]">
                                    <input
                                        type="text"
                                        placeholder={`Search ${col.name || col.label}...`}
                                        value={this.state.search_values?.[col.column] ?? ''}
                                        onChange={(e) => {
                                            const search_values = { ...this.state.search_values, [col.column]: e.target.value };
                                            this.setState({ search_values });
                                            this.gridSearch(col, e.target.value);
                                        }}
                                        className="w-full bg-white border border-[#edf2f7] rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium placeholder-[#94a3b8] text-[#1e293b] focus:outline-none focus:border-[#3b82f6] shadow-sm transition-colors"
                                    />

                                    {this.state.search_values?.[col.column] && (
                                        <button
                                            onClick={() => {
                                                const search_values = { ...this.state.search_values, [col.column]: '' };
                                                this.setState({ search_values });
                                                this.gridSearch(col, '');
                                            }}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#475569]"
                                        >
                                            <Clear sx={{ fontSize: 12 }} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </TableCell>
                    );
                })}

                <TableCell sx={{ padding: '0px 0px', borderBottom: 'none' }} />

            </TableRow>
        );
    }

    renderData = () => {

        const columns = this.props.columns;

        if (!columns.length) return null;

        const data = this.getData();

        if (!data || !data.length) return null;

        return data.map((_row, n) => {
            const _n = n;
            const cols = [];

            columns.forEach((column, idx) => {
                if (!(column && typeof column === 'object' && column.hasOwnProperty('column'))) return;

                let row_data = _row[column.column];
                const original_value = row_data;

                if (column.search_data?.length) {
                    const found = column.search_data.find(r => r.key === row_data);
                    if (found) row_data = found.value;
                }

                const row_index = `d_${n}_${idx}_${column.column}`;

                if (column.selectable) {
                    cols.push(
                        <TableCell key={`ck_${n}_${idx}`} sx={{ ...CELL_RESET, width: 40 }}>
                            <Checkbox
                                color="primary"
                                size="small"
                                checked={this.state.checked_rows.indexOf(row_data) > -1}
                                onChange={() => {
                                    let cr = this.state.checked_rows;
                                    let crd = this.state.checked_rows_data;
                                    if (cr.indexOf(row_data) > -1) {
                                        cr.splice(cr.indexOf(row_data), 1);
                                        crd = crd.filter(r => r[column.column] !== row_data);
                                    } else {
                                        cr.push(row_data);
                                        crd.push(_row);
                                    }
                                    this.setState({ checked_rows: cr, checked_rows_data: crd }, this.returnCheckedRows);
                                }}
                            />
                        </TableCell>
                    );
                } else if (column.renderer) {
                    const val = typeof column.renderer === 'function'
                        ? column.renderer(_row, _n, row_data)
                        : this.props[column.renderer](_row, n, row_data);

                    cols.push(
                        <EditableCell
                            original_value={original_value}
                            key={row_index}
                            column={column} row={_row} num={_n} row_data={row_data} value={val}
                            account_token={this.props.account_token}
                            onClick={(e) => this.setState({ editable_cell: e.target, selected_row_data: column, selected_row_index: _n })}
                            onCancel={() => this.setState({ selected_row_index: false })}
                            cell_update_url={column.cell_update_url ?? this.props.cell_update_url}
                            onUpdate={(rd, col) => this._updateRow(rd, col ?? column)}
                            sx={CELL_RESET}
                        />
                    );
                } else {
                    cols.push(
                        <EditableCell
                            original_value={original_value}
                            key={row_index}
                            column={column} row={_row} num={_n} row_data={row_data} value={row_data}
                            account_token={this.props.account_token}
                            onClick={(e) => this.setState({ editable_cell: e.target, selected_row_data: column, selected_row_index: _n })}
                            onCancel={() => this.setState({ selected_row_index: false })}
                            cell_update_url={column.cell_update_url ?? this.props.cell_update_url}
                            onUpdate={(rd) => this._updateRow(rd, column)}
                            sx={CELL_RESET}
                        />
                    );
                }
            });

            return (
                
                <TableRow
                    key={`row_${n}`}
                    className="group transition-all duration-150 hover:bg-[#f8fafc]"
                    sx={{
                        '& td': { ...CELL_RESET },
                    }}
                >
                    {cols}

                    <TableCell sx={{ ...CELL_RESET, textAlign: 'right', width: 120 }}>
                        {this.props.row_actions ? (
                            this.props.row_actions(_row, n)
                        ) : (
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                {this.props.view_url && this.props.row_id && (
                                    <>
                                        <Link
                                            to={`/${this.props.view_url}/${_row[this.props.row_id]}`}
                                            className="text-xs font-semibold text-[#3b82f6] hover:text-[#1d4ed8] transition-colors"
                                        >
                                            Edit
                                        </Link>
                                        <Link to={`/${this.props.view_url}/${_row[this.props.row_id]}`}>
                                            <button className="w-6 h-6 flex items-center justify-center rounded-full bg-white border border-[#e2e8f0] text-[#64748b] hover:border-[#3b82f6] hover:text-[#3b82f6] shadow-sm transition-all">
                                                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                                                    <path d="M4.5 10.5L8 7L4.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </button>
                                        </Link>
                                    </>
                                )}
                            </div>
                        )}
                    </TableCell>
                </TableRow>
            );
        });
    }

    _updateRow = (row_data, column) => {

        const _row_id = column.row_id ?? this.props.row_id;

        if (this.props.updateData) {
            const data = [...this.props.data];
            const i = data.findIndex(r => r[_row_id] === row_data[_row_id]);
            data[i] = row_data;
            this.props.updateData({ records: data });
        } else {
            const data = [...this.state.data];
            const i = data.findIndex(r => r[_row_id] === row_data[_row_id]);
            data[i] = row_data;
            this.setState({ data });
        }
    }

    renderSkeleton = () => {

        return (
            <div className="w-full bg-white border border-[#edf2f7] rounded-2xl p-4 space-y-3 mt-4">

                {Array.from({ length: 6 }, (_, i) => (

                    <Skeleton key={i} animation="wave" variant="rectangular" width="100%" height={48} rx={6} sx={{ borderRadius: 1.5 }} />
                    
                ))}
            </div>
        )
    }

    renderListComponent = () => {

        const data = this.getData();

        if (!this.props.list_component) return null;

        return data.map((_row, index) => {
            return (
                <Grid item xs={12} key={`list_component_item_${index}`}>
                    {this.props.list_component(_row, index)}
                </Grid>
            )
        });
    }

    loadData = (page, account_token, paging_request, loader) => {

        this.setState({ loading: !!loader });

        if (!loader) this.setState({ show_loader: true });

        const fd = new FormData();
        fd.append('account_token', account_token);
        fd.append('page', page);
        fd.append('per_page', this.state.per_page);

        if (this.state.column_sort_by) { 
            fd.append('sort_by', this.state.column_sort_by); 
            fd.append('sort_dir', this.state.sort_by_dir); 
        }

        if (Object.keys(this.state.search).length) {
            fd.append('search', JSON.stringify(this.state.search));
        }

        if (this.props.post_params?.length) {
            this.props.post_params.forEach(p => fd.append(p.key, p.value));
        }

        let filters = {};

        if (this.props.filter_params?.length) {
            this.props.filter_params.forEach(p => { filters[p.key] = p.value; });
        }

        const atf = this.state.applied_tabbed_filters;

        if (atf.length) {
            atf.forEach(f => { if (f.value !== '**') { fd.append(f.key, f.value); filters[f.key] = f.value; } });
        }

        if (Object.keys(filters).length) {
            fd.append('filters', JSON.stringify(filters));
        }

        Api.post(this.props.api_url, fd, (data) => {
            this.setState({ loading: false, show_loader: false, fadeOut: true });

            if (this.props.relaodDone) this.props.relaodDone();

            if (data.status) {
                this.setState({ no_data: !(data.records?.length > 0) });

                if (this.props.updateData) this.props.updateData(data);
                else this.setState({ data: data.records });

                this.setState({ total_records: data.total, per_page: data.per_page });
            }
        });
    }

    gridSearch = (column, keyword) => {

        if (this.search_interval) clearTimeout(this.search_interval);

        let search = this.state.search;
        let _column = column.db_column ?? column.field ?? column.column;

        if (column.table) _column = `${column.table}.${_column}`;
        if (keyword === '') delete search[_column];
        else search[_column] = { keyword, type: column.search_type ?? 'like' };

        this.setTableIndex('search', JSON.stringify(search));
        this.setState({ search, page: 0 });

        this.search_interval = setTimeout(() => this.loadData(0, this.props.account_token, true, false), 500);
    }

    renderHeaderCell = (column, index) => {

        if (column.selectable) {
            return (
                <TableCell key="hd_check" sx={{ ...HEAD_CELL, width: 40 }}>
                    <button
                        className="flex items-center"
                        onClick={(e) => {
                            if (this.state.select_all || this.state.main_checked) {
                                this.setState({ checked_rows: [], checked_rows_data: [], select_all: false, bulk_selection: false, main_checked: false });
                                if (this.props.onSelectAll) this.props.onSelectAll(false, {});
                                if (this.props.onRowCheck) this.props.onRowCheck([]);
                            } else {
                                this.setState({ bulk_selection: e.currentTarget });
                            }
                        }}
                    >
                        {this.state.select_all || this.state.main_checked
                            ? <CheckBoxIcon sx={{ fontSize: 18, color: '#3b82f6' }} />
                            : <CheckBoxOutlineBlank sx={{ fontSize: 18, color: '#94a3b8' }} />
                        }
                    </button>
                </TableCell>
            );
        }

        if (column.sortable) {
            return (
                <TableCell key={`hd_${column.column}_${index}`} sx={HEAD_CELL}>
                    <TableSortLabel
                        active={this.state.column_sort_by === (column.field || column.column)}
                        direction={this.state.sort_by_dir}
                        onClick={() => this.sortColumn(column)}
                        sx={{ color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}
                    >
                        {column.name}
                    </TableSortLabel>
                </TableCell>
            );
        }

        return (
            <TableCell key={`hd_${column.column}_${index}`} sx={HEAD_CELL}>
                <div className="flex items-center gap-1">
                    <span>{column.name}</span>
                </div>
            </TableCell>
        );
    }

    sortColumn = (column) => {

        this.setState({ column_sort_by: column.field || column.column, sort_by_dir: this.state.sort_by_dir === 'asc' ? 'desc' : 'asc', page: 0 });

        window.setTimeout(() => this.loadData(this.state.page, this.props.account_token, false, false), 500);
    }

    checkAll = () => {

        const cr = []; const crd = [];

        this.getData().forEach(_row => {
            this.props.columns.forEach(col => {
                if (col.selectable) { cr.push(_row[col.column]); crd.push(_row); }
            });
        });

        this.setState({ checked_rows: cr, checked_rows_data: crd }, this.returnCheckedRows);
    }

    unCheckAll = () => this.setState({ checked_rows: [], checked_rows_data: [], main_checked: false }, this.returnCheckedRows);

    returnCheckedRows = () => { if (this.props.onRowCheck) this.props.onRowCheck(this.state.checked_rows_data); }

    getData = () => this.props.data ?? this.state.data;

    _getIdx = () => { try { return JSON.parse(localStorage.getItem(`${process.env.REACT_APP_PREFIX}wd_datatable_index_${this.props.index}`) || '{}'); } catch { return {}; } }

    setTableIndex = (key, value) => {
        const idx = this._getIdx(); idx[key] = value;
        localStorage.setItem(`${process.env.REACT_APP_PREFIX}wd_datatable_index_${this.props.index}`, JSON.stringify(idx));
    }

    getTableIndex = (key) => { const idx = this._getIdx(); return idx.hasOwnProperty(key) ? idx[key] : false; }
}

const mapStateToProps = state => ({ paging: state.paging.paging });

export default connect(mapStateToProps, { Paging })(DataTable);