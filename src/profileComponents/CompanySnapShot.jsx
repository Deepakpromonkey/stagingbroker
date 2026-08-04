import React from 'react';
import {
    VerifiedUser,
    LocalShipping,
    Inventory2,
    Security,
    CheckCircle,
    RadioButtonUnchecked
} from '@mui/icons-material';

class SelectPill extends React.Component {
    render() {
        const isSelected = this.props.selected;
        const layoutClass = isSelected 
            ? 'bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe] font-[700]' 
            : 'bg-[#f8fafc] text-[#94a3b8] border-[#f1f5f9] opacity-75 font-[500]';

        return (
            <div className={"flex items-center gap-[10px] w-[calc(33.333%-7px)] rounded-[10px] border p-[14px] text-[11px] transition-colors " + layoutClass}>
                {isSelected ? (
                    <CheckCircle sx={{ fontSize: 16, color: '#2563eb' }} />
                ) : (
                    <RadioButtonUnchecked sx={{ fontSize: 16, color: '#cbd5e1' }} />
                )}
                <span className={isSelected ? "text-[#0f172a]" : "text-[#94a3b8]"}>
                    {this.props.label}
                </span>
            </div>
        );
    }
}

class StatusFlagPill extends React.Component {
    render() {
        const hasValue = this.props.value;
        const layoutClass = hasValue 
            ? 'bg-[#eff6ff] text-[#2563eb]' 
            : 'bg-[#f8fafc] text-[#64748b]';
        
        return (
            <div className={"flex items-center gap-[8px] rounded-full px-[14px] py-[6px] text-[11px] font-[600] border border-transparent " + layoutClass}>
                <span className={"h-[6px] w-[6px] rounded-full " + (hasValue ? "bg-[#2563eb]" : "bg-[#94a3b8]")} />
                <span>{this.props.label}:</span>
                <span className={hasValue ? "text-[#2563eb] font-[700]" : "text-[#0f172a] font-[700]"}>
                    {hasValue ? 'Yes' : 'No'}
                </span>
            </div>
        );
    }
}

class CompanySnapshot extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            historyPage: 0,
            insurancePage: 0
        };
    }

    getStatusStyles(statusValue) {
        if (!statusValue) {
            return 'bg-[#f1f5f9] text-[#64748b]';
        }

        const normalized = statusValue.toString().trim().toUpperCase();
        const isActive = ['ACTIVE', 'VALIDATED', 'TRUE', 'YES', 'AUTHORIZED'].includes(normalized);

        return isActive 
            ? 'bg-[#ecfdf3] text-[#16a34a]'  
            : 'bg-[#fef2f2] text-[#dc2626]';
    }

    getOperationText(operationValue) {
        if (!operationValue) return '-';
        
        const normalized = operationValue.toString().trim().toUpperCase();
        switch (normalized) {
            case 'A':
                return 'Interstate';
            case 'B':
                return 'Intrastate Hazardous Material';
            case 'C':
                return 'Intrastate Non-Hazardous Material';
            default:
                return operationValue;
        }
    }

    // Strict Rule Check: Strictly 'A' is Active, any other letter/value is Inactive
    getAuthorityStateLabel(stateValue) {
        if (!stateValue) return 'Inactive';
        return stateValue.toString().trim().toUpperCase() === 'A' ? 'Active' : 'Inactive';
    }

    handleInsurancePrev() {
        if (this.state.insurancePage > 0) {
            this.setState({ insurancePage: this.state.insurancePage - 1 });
        }
    }

    handleInsuranceNext(totalPages) {
        if (this.state.insurancePage < totalPages - 1) {
            this.setState({ insurancePage: this.state.insurancePage + 1 });
        }
    }

    render() {
        if (!this.props.data) {
            return null;
        }

        const operationClassificationOptions = [
            {
                label: 'Authorized For Hire',
                value: 'authorized_for_hire',
                selected: this.props.data.company_snapshot?.authorized_for_hire
            },
            {
                label: 'Exempt For Hire',
                value: 'exempt_for_hire',
                selected: this.props.data.company_snapshot?.exempt_for_hire
            },
            {
                label: 'Private Property',
                value: 'private_property',
                selected: this.props.data.company_snapshot?.private_property
            },
            {
                label: 'Migrant',
                value: 'migrant',
                selected: this.props.data.company_snapshot?.migrant
            },
            {
                label: 'Private Passenger Business',
                value: 'private_passenger_business',
                selected: this.props.data.company_snapshot?.private_passenger_business
            },
            {
                label: 'Private Passenger Nonbusiness',
                value: 'private_passenger_nonbusiness',
                selected: this.props.data.company_snapshot?.private_passenger_nonbusiness
            }
        ];

        const cargoCarriedOptions = [
            {
                label: 'General Freight',
                value: 'crgo_genfreight',
                selected: this.props.data.carrier_detail?.crgo_genfreight === 'X'
            },
            {
                label: 'Bldg Mat',
                value: 'crgo_bldgmat',
                selected: this.props.data.carrier_detail?.crgo_bldgmat === 'X'
            },
            {
                label: 'Machinery',
                value: 'crgo_machlrg',
                selected: this.props.data.carrier_detail?.crgo_machlrg === 'X'
            },
            {
                label: 'Fresh Prod',
                value: 'crgo_produce',
                selected: this.props.data.carrier_detail?.crgo_produce === 'X'
            },
            {
                label: 'Live Stock',
                value: 'crgo_livestock',
                selected: this.props.data.carrier_detail?.crgo_livestock === 'X'
            },
            {
                label: 'Grain Feed',
                value: 'crgo_grainfeed',
                selected: this.props.data.carrier_detail?.crgo_grainfeed === 'X'
            },
        ];

        const insuranceItemsPerPage = 4;
        const insuranceFilings = this.props.data.insurance_filings || [];
        const totalInsuranceItems = insuranceFilings.length;
        const totalInsurancePages = Math.ceil(totalInsuranceItems / insuranceItemsPerPage);
        const startInsuranceIndex = this.state.insurancePage * insuranceItemsPerPage;
        const visibleInsuranceFilings = insuranceFilings.slice(startInsuranceIndex, startInsuranceIndex + insuranceItemsPerPage);

        const itemFrom = totalInsuranceItems === 0 ? 0 : startInsuranceIndex + 1;
        const itemTo = Math.min(startInsuranceIndex + insuranceItemsPerPage, totalInsuranceItems);

        const authorityStatusText = this.props.data.authorityStatus ? this.props.data.authorityStatus.status : '';
        const insuranceStatusText = this.props.data.insurance && this.props.data.insurance.status ? this.props.data.insurance.status : 'VALIDATED';

        const bipdCoverage = this.props.data.insurance_summary ? this.props.data.insurance_summary.bipd_coverage_total_amount : '-';
        const cargoInsurance = this.props.data.insurance_summary ? this.props.data.insurance_summary.cargo_insurance_total_amount : '-';
        const bondTrust = this.props.data.insurance_summary ? this.props.data.insurance_summary.bond_total_amount : '-';

        const rawOperationValue = this.props.data.carrier_operation || this.props.data.authorityStatus?.operation;
        const parsedOperationText = this.getOperationText(rawOperationValue);

const commonStatusText = this.getAuthorityStateLabel(this.props.data.authority?.common_stat);
const contractStatusText = this.getAuthorityStateLabel(this.props.data.authority?.contract_stat);
const brokerStatusText = this.getAuthorityStateLabel(this.props.data.authority?.broker_stat);

        return (
            <div className="space-y-[24px] bg-[#fbfbfc] p-[24px] rounded-[16px]">

                <div>
                    <div className="flex items-center mt-2 gap-2">
                        <div className="h-[6px] w-[6px] rounded-full bg-[#22c55e]" />
                        <h2 className="text-[13px] font-[800] tracking-[0.8px] text-[#111827] uppercase">
                            Company Snapshot
                        </h2>
                    </div>

                    <p className="mt-[8px] max-w-[920px] text-[9px] leading-[15px] text-[#7c8aa0]">
                        Fleet tractors and trailers identified through observations on
                        the road. Note: If the carrier has no recent observations,
                        equipment may not be shown — even if power units are reported.
                    </p>
                </div>

                <div className="rounded-[12px] border border-[#e2e8f0] bg-white overflow-hidden">
                    
                    <div className="flex items-center justify-between px-[24px] py-[18px] border-b border-[#f1f5f9]">
                        <div className="flex items-center gap-[10px]">
                            <div className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] bg-[#eff6ff] border border-[#e2e8f0] text-[#2563eb] pt-[4px]">
                                <VerifiedUser sx={{ fontSize: 16 }} />
                            </div>
                            <h3 className="text-[12px] font-[800] uppercase tracking-wider text-[#1e293b]">
                                Authority Status
                            </h3>
                        </div>

                        {/* <span className={"rounded-full px-[14px] py-[4px] text-[11px] font-[800] tracking-wide uppercase " + this.getStatusStyles(authorityStatusText)}>
                            {authorityStatusText || 'UNKNOWN'}
                        </span> */}
                    </div>

                    <div className="p-[24px]">

                        <div className="grid grid-cols-4 gap-[16px] pt-[4px]">
                            <div className="rounded-[10px] bg-[#eff6ff] p-[16px]">
                                <p className="text-[9px] font-[700] uppercase tracking-wider text-[#94a3b8]">COMMON</p>
                                <p className="mt-[12px] text-[14px] font-[800] text-[#2563eb]">
                                    {commonStatusText}
                                </p>
                            </div>
                            <div className="rounded-[10px] bg-[#eff6ff] p-[16px]">
                                <p className="text-[9px] font-[700] uppercase tracking-wider text-[#94a3b8]">CONTRACT</p>
                                <p className="mt-[12px] text-[14px] font-[800] text-[#2563eb]">
                                    {contractStatusText}
                                </p>
                            </div>
                            <div className="rounded-[10px] bg-[#eff6ff] p-[16px]">
                                <p className="text-[9px] font-[700] uppercase tracking-wider text-[#94a3b8]">BROKER</p>
                                <p className="mt-[12px] text-[14px] font-[800] text-[#2563eb]">
                                    {brokerStatusText}
                                </p>
                            </div>
                            <div className="rounded-[10px] bg-[#eff6ff] p-[16px]">
                                <p className="text-[9px] font-[700] uppercase tracking-wider text-[#94a3b8]">OPERATION</p>
                                <p className="mt-[12px] text-[12px] font-[800] text-[#2563eb] leading-[16px]">
                                    {parsedOperationText}
                                </p>
                            </div>
                        </div>

                        {/* FLAG HORIZONTAL RUNNER */}
                        {/* <div className="mt-[20px] flex flex-wrap gap-[10px] pt-[4px]">
                            <StatusFlagPill 
                                label="Property" 
                                value={this.props.data.authorityStatus && this.props.data.authorityStatus.flags ? this.props.data.authorityStatus.flags.property : false} 
                            />
                            <StatusFlagPill 
                                label="Passenger" 
                                value={this.props.data.authorityStatus && this.props.data.authorityStatus.flags ? this.props.data.authorityStatus.flags.passenger : false} 
                            />
                            <StatusFlagPill 
                                label="Household" 
                                value={this.props.data.authorityStatus && this.props.data.authorityStatus.flags ? this.props.data.authorityStatus.flags.household : false} 
                            />
                            <StatusFlagPill 
                                label="Hazmat" 
                                value={this.props.data.authorityStatus && this.props.data.authorityStatus.flags ? this.props.data.authorityStatus.flags.hazmat : false} 
                            />
                        </div> */}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-[24px]">
                    <div className="rounded-[12px] border border-[#e2e8f0] bg-white p-[24px]">
                        <div className="flex items-center gap-[10px] mb-[20px]">
                            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] border border-[#e2e8f0] text-[#2563eb] bg-[#eff6ff] pt-[4px]">
                                <LocalShipping sx={{ fontSize: 16 }} />
                            </div>
                            <h4 className="text-[14px] font-[500] text-[#1e293b]">
                                Operation Classification
                            </h4>
                        </div>
                        <div className="flex flex-wrap gap-[10px]">
                            {operationClassificationOptions.map((opt) => {
                                return (
                                    <SelectPill
                                        key={opt.value}
                                        label={opt.label}
                                        selected={opt.selected}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    <div className="rounded-[12px] border border-[#e2e8f0] bg-white p-[24px]">
                        <div className="flex items-center gap-[10px] mb-[20px]">
                            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] border border-[#e2e8f0] text-[#2563eb] bg-[#eff6ff] pt-[4px]">
                                <Inventory2 sx={{ fontSize: 16 }} />
                            </div>
                            <h4 className="text-[14px] font-[500] text-[#1e293b]">
                                Cargo Carried
                            </h4>
                        </div>
                        <div className="flex flex-wrap gap-[10px]">
                            {cargoCarriedOptions.map((opt) => {
                                return (
                                    <SelectPill
                                        key={opt.value}
                                        label={opt.label}
                                        selected={opt.selected}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="rounded-[12px] border border-[#e2e8f0] bg-white p-[24px]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-[10px]">
                            <span className="h-[16px] w-[3px] rounded bg-[#2563eb]" />
                            <h3 className="text-[14px] font-[500] text-[#1e293b]">
                                Insurance & Financial Responsibility
                            </h3>
                        </div>

                        <span className={"rounded-full px-[14px] py-[4px] text-[11px] font-[800] tracking-wide uppercase " + this.getStatusStyles(insuranceStatusText)}>
                            {insuranceStatusText}
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-[16px] my-[24px]">
                        <div className="rounded-[10px] border border-[#e2e8f0] bg-white p-[20px] flex items-center gap-[16px]">
                            <div className="flex h-[40px] w-[40px] items-center justify-center rounded-[10px] bg-[#eff6ff] pt-[11px] text-[#2563eb]">
                                <Security sx={{ fontSize: 18 }} />
                            </div>
                            <div>
                                <p className="text-[9px] font-[700] uppercase tracking-wider text-[#94a3b8]">BIPD COVERAGE</p>
                                <p className="mt-[4px] text-[18px] font-[800] text-[#0f172a]">
                                    {bipdCoverage !== '-' && bipdCoverage !== null ? `$${Number(bipdCoverage).toLocaleString()}` : '-'}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-[10px] border border-[#e2e8f0] bg-white p-[20px] flex items-center gap-[16px]">
                            <div className="flex h-[40px] w-[40px] items-center justify-center rounded-[10px] bg-[#eff6ff] pt-[11px] text-[#2563eb]">
                                <Inventory2 sx={{ fontSize: 18 }} />
                            </div>
                            <div>
                                <p className="text-[9px] font-[700] uppercase tracking-wider text-[#94a3b8]">CARGO INSURANCE</p>
                                <p className="mt-[4px] text-[18px] font-[800] text-[#0f172a]">
                                    {cargoInsurance !== '-' && cargoInsurance !== null ? `$${Number(cargoInsurance).toLocaleString()}` : '-'}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-[10px] border border-[#e2e8f0] bg-white p-[20px] flex items-center gap-[16px]">
                            <div className="flex h-[40px] w-[40px] items-center justify-center rounded-[10px] bg-[#eff6ff] pt-[11px] text-[#2563eb]">
                                <Security sx={{ fontSize: 18 }} />
                            </div>
                            <div>
                                <p className="text-[9px] font-[700] uppercase tracking-wider text-[#94a3b8]">BOND / TRUST</p>
                                <p className="mt-[4px] text-[18px] font-[800] text-[#0f172a]">
                                    {bondTrust !== '-' && bondTrust !== null ? `$${Number(bondTrust).toLocaleString()}` : '-'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[8px] border border-[#e2e8f0] overflow-hidden">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-[#f8fafc]">
                                    <th className="px-[20px] py-[12px] text-left text-[10px] font-[800] tracking-wider text-[#64748b]">CARRIER NAME</th>
                                    <th className="px-[20px] py-[12px] text-left text-[10px] font-[800] tracking-wider text-[#64748b]">POLICY #</th>
                                    <th className="px-[20px] py-[12px] text-left text-[10px] font-[800] tracking-wider text-[#64748b]">TYPE</th>
                                    <th className="px-[20px] py-[12px] text-left text-[10px] font-[800] tracking-wider text-[#64748b]">COVERAGE AMOUNT</th>
                                    <th className="px-[20px] py-[12px] text-left text-[10px] font-[800] tracking-wider text-[#64748b]">EFFECTIVE DATE</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-[#f1f5f9]">
                                {visibleInsuranceFilings.map((p) => {
                                    return (
                                        <tr key={p.id} className="hover:bg-[#f8fafc]/40">
                                            <td className="px-[20px] py-[16px] text-[11px] font-[700] uppercase text-[#334155]">
                                                {p.name_company || '-'}
                                            </td>
                                            <td className="px-[20px] py-[16px] text-[11px] font-[700] text-[#334155]">
                                                {p.policy_no || '-'}
                                            </td>
                                            <td className="px-[20px] py-[16px]">
                                                <span className="rounded bg-[#eff6ff] px-[10px] py-[3px] text-[10px] font-[800] uppercase text-[#2563eb]">
                                                    {p.ins_type_desc || '-'}
                                                </span>
                                            </td>
                                            <td className="px-[20px] py-[16px] text-[11px] font-[800] text-[#2563eb]">
                                                {p.min_cov_amount !== null && p.min_cov_amount !== undefined ? `$${Number(p.min_cov_amount).toLocaleString()}` : '-'}
                                            </td>
                                            <td className="px-[20px] py-[16px] text-[11px] font-[500] text-[#64748b]">
                                                {p.effective_date || '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {insuranceFilings.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-[20px] py-[16px] text-center text-[11px] font-[500] text-[#64748b]">
                                            No active filings available
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {insuranceFilings.length > 0 && (
                            <div className="flex items-center justify-between px-[20px] py-[12px] bg-white border-t border-[#f1f5f9]">
                                <div className="text-[11px] font-[500] text-[#64748b]">
                                    Showing {itemFrom} to {itemTo} of {totalInsuranceItems} entries
                                </div>
                                <div className="flex items-center gap-[8px]">
                                    <button 
                                        onClick={() => { this.handleInsurancePrev(); }}
                                        disabled={this.state.insurancePage === 0}
                                        className={"px-[12px] py-[6px] text-[11px] font-[600] rounded-[6px] border border-[#e2e8f0] transition-colors " + (this.state.insurancePage === 0 ? "text-[#cbd5e1] cursor-not-allowed bg-[#f8fafc]" : "text-[#334155] bg-white hover:bg-[#f8fafc]")}
                                    >
                                        Previous
                                    </button>
                                    <button 
                                        onClick={() => { this.handleInsuranceNext(totalInsurancePages); }}
                                        disabled={this.state.insurancePage >= totalInsurancePages - 1}
                                        className={"px-[12px] py-[6px] text-[11px] font-[600] rounded-[6px] border border-[#e2e8f0] transition-colors " + (this.state.insurancePage >= totalInsurancePages - 1 ? "text-[#cbd5e1] cursor-not-allowed bg-[#f8fafc]" : "text-[#334155] bg-white hover:bg-[#f8fafc]")}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        );
    }
}

export default CompanySnapshot;