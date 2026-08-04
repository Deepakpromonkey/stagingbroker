import React from 'react';
// import { InsertDriveFileOutlined } from '@mui/icons-material';

import SafetyConsoleTabs from './SafetyConsoleTabs';
import Overview from './tabs/Overview';
import Basics from './tabs/Basics';
import Inspections from './tabs/Inspections';
import Crashes from './tabs/Crashes';

class SafetyIntelligenceConsole extends React.Component {
    constructor(props) {
        super(props);
        
        this.state = {
            activeTab: 'OVERVIEW'
        };

        this.handleTabChange = this.handleTabChange.bind(this);
        this.renderTabContent = this.renderTabContent.bind(this);
    }

    handleTabChange(newTab) {
        this.setState({
            activeTab: newTab
        });
    }

    renderTabContent(safetyData) {
        let basicsData = {
            sms_measures: safetyData.sms_measures ? safetyData.sms_measures : {},
            violation_details: safetyData.violation_details ? safetyData.violation_details : [],
            inspections: safetyData.inspections ? safetyData.inspections : [],
            criticalWarning: 'No warnings available'
        };

        if (safetyData.sms_measures && safetyData.sms_measures.veh_maint_measure) {
            basicsData.criticalWarning = `Vehicle maintenance score at ${Math.round(Number(safetyData.sms_measures.veh_maint_measure))}`;
        }

        switch (this.state.activeTab) {
            case 'OVERVIEW':
                return (
                    <Overview 
                        data={safetyData}
                    />
                );
            case 'BASICS':
                return (
                    <Basics 
                        data={basicsData} 
                    />
                );
            case 'INSPECTIONS':
                return (
                    <Inspections 
                       data={safetyData}
                    />
                );
            case 'CRASHES':
                return (
                    <Crashes 
                       data={safetyData}
                    />
                );
            default:
                return (
                    <Overview 
                        data={safetyData}
                    />
                );
        }
    }

    render() {
        let safetyData = this.props.data ? this.props.data : {};

        return (
            <div className="overflow-hidden rounded-[16px] border border-[#d9e1ee] bg-white shadow-sm">
                <div className="flex items-center justify-between px-[32px] py-[24px]">
                    <div className="flex items-center gap-3">
                        <div className="h-[8px] w-[8px] rounded-full bg-[#10b981]" />
                        <h2 className="text-[14px] font-[800] uppercase tracking-tight text-[#001b3d]">
                            Safety Intelligence Console
                        </h2>
                    </div>
                    {/* <InsertDriveFileOutlined className="cursor-pointer !text-[20px] text-[#94a3b8]" /> */}
                </div>
                
                <SafetyConsoleTabs
                    activeTab={this.state.activeTab}
                    onTabChange={this.handleTabChange}
                />
                
                <div className="bg-white">
                    {this.renderTabContent(safetyData)}
                </div>
            </div>
        );
    }
}

export default SafetyIntelligenceConsole;