import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
	PersonOutlineOutlined,
	GroupsOutlined,
	ApartmentOutlined,
	Inventory2Outlined,
	PhoneIphoneOutlined,
	PersonOffOutlined,
	CreditCardOutlined,
	ExtensionOutlined,
	AllInclusiveOutlined,
	InventoryOutlined,
	SupportAgentOutlined,
} from '@mui/icons-material';

// Marks that the user has picked a plan so route guards (e.g. the
// dashboard route) can allow access. No pricing API yet, so this is
// stored locally for now. Keep this key in sync with RouteGuard.js's
// PLAN_STORAGE_KEY.
const PLAN_STORAGE_KEY = 'crm_plan_selected';

const PLANS = [
	{
		id: 'individual',
		icon: PersonOutlineOutlined,
		name: 'Individual',
		price: '$249',
		period: '/mo',
		description: 'One desk, one operator, full platform.',
		features: [
			{ icon: Inventory2Outlined, label: '100 loads per month' },
			{ icon: PhoneIphoneOutlined, label: 'Driver app' },
			{ icon: PersonOffOutlined, label: 'Single user, no sub-users' },
			{ icon: CreditCardOutlined, label: 'DT Pay at 1.9%' },
			{ icon: ExtensionOutlined, label: 'Chrome extension' },
		],
		note: 'Extra loads billed at $2.75 each',
		cta: 'Start with Individual',
		popular: false,
	},
	{
		id: 'team',
		icon: GroupsOutlined,
		name: 'Team',
		price: '$499',
		period: '/mo',
		description: 'A whole desk on one queue, cheaper per load.',
		features: [
			{ icon: Inventory2Outlined, label: '250 loads per month' },
			{ icon: PhoneIphoneOutlined, label: 'Driver app' },
			{ icon: GroupsOutlined, label: 'Up to 10 sub-users' },
			{ icon: CreditCardOutlined, label: 'DT Pay at 1.5%' },
			{ icon: ExtensionOutlined, label: 'Chrome extension' },
		],
		note: 'Extra loads billed at $2.25 each',
		cta: 'Get Team',
		popular: true,
	},
	{
		id: 'enterprise',
		icon: ApartmentOutlined,
		name: 'Enterprise',
		price: 'Contact for price',
		period: '',
		description: 'Multi-desk volume, sized to your book.',
		features: [
			{ icon: InventoryOutlined, label: 'Load volume to fit' },
			{ icon: PhoneIphoneOutlined, label: 'Driver app' },
			{ icon: AllInclusiveOutlined, label: 'Unlimited users' },
			{ icon: CreditCardOutlined, label: 'DT Pay at negotiated rate' },
			{ icon: ExtensionOutlined, label: 'Chrome extension' },
		],
		note: 'No overage, volume set in contract',
		cta: 'Contact sales',
		popular: false,
	},
];

function Subscription() {

	const navigate = useNavigate();

	const [selectedPlan, setSelectedPlan] = useState(
		() => localStorage.getItem(PLAN_STORAGE_KEY) || null
	);

	// Picking a plan always unlocks and continues to the dashboard, whether
	// the user arrived here fresh from signup or was redirected here by
	// RouteGuard for not having a plan selected yet (that redirect uses
	// `replace` with no location state, so we can't rely on state to decide
	// whether to continue on).
	const handleSelectPlan = (plan) => {

		setSelectedPlan(plan.id);
		localStorage.setItem(PLAN_STORAGE_KEY, plan.id);

		if (plan.id === 'enterprise') {
			// No self-serve checkout for Enterprise yet — send them to sales,
			// but still unlock the dashboard since a plan has been chosen.
			window.location.href = 'mailto:sales@yourcompany.com?subject=Enterprise%20Plan%20Inquiry';
		}

		navigate('/dashboard');
	};

	return (
		<div className="w-full bg-[#000B21] relative overflow-hidden pt-[100px] pb-[100px] px-[24px] text-white">

			<div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#0044B3] rounded-full blur-[160px] opacity-20 pointer-events-none" />

			<div className="absolute bottom-[-15%] right-[-5%] w-[450px] h-[450px] bg-[#0033aa] rounded-full blur-[140px] opacity-15 pointer-events-none" />

			<div className="max-w-[1140px] mx-auto text-center flex flex-col items-center mb-[64px] relative z-10">

				<p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#3B82F6] mb-[16px]">
					Pricing
				</p>

				<h2 className="text-[40px] md:text-[48px] font-normal tracking-tight text-white leading-[1.2]">
					Scale with Precision
				</h2>

				<p className="text-[15px] font-normal text-[#94A3B8] max-w-[560px] mt-[18px] leading-[1.6]">
					Transparent models that evolve as you do. No hidden overhead, just absolute performance.
				</p>

			</div>

			<div className="max-w-[1140px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-[28px] items-stretch relative z-10">

				{PLANS.map((plan) => {

					const HeaderIcon = plan.icon;
					const isPopular = plan.popular;
					const isSelected = selectedPlan === plan.id;

					return (
						<div
							key={plan.id}
							className={
								isPopular
									? 'rounded-[24px] bg-[#001D6680] border-2 border-[#0052CC] p-[36px] flex flex-col justify-between relative transition-all duration-300 hover:translate-y-[-4px] hover:bg-[#002277A6] shadow-[0_0_40px_rgba(0,82,204,0.15)]'
									: 'rounded-[24px] bg-[#031333B3] border border-[#1E293B] p-[36px] flex flex-col justify-between transition-all duration-300 hover:border-[#334155] hover:translate-y-[-4px] hover:bg-[#041840E6]'
							}
						>
							{isPopular && (
								<div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#0052CC] text-white text-[10px] font-bold uppercase tracking-[0.18em] px-[18px] py-[6px] rounded-full shadow-md whitespace-nowrap">
									Popular
								</div>
							)}

							<div>
								<div className={`flex items-center gap-[10px] mb-[24px] ${isPopular ? 'mt-[6px]' : ''}`}>
									<HeaderIcon
										className={isPopular ? 'text-[#93C5FD]' : 'text-[#94A3B8]'}
										sx={{ fontSize: 20 }}
									/>
									<p className={`text-[15px] font-semibold ${isPopular ? 'text-[#93C5FD]' : 'text-[#E2E8F0]'}`}>
										{plan.name}
									</p>
								</div>

								<div className="flex items-baseline mb-[20px] flex-wrap">
									<span className={`font-normal text-white tracking-tight ${plan.id === 'enterprise' ? 'text-[32px]' : 'text-[48px]'}`}>
										{plan.price}
									</span>
									{plan.period && (
										<span className="text-[13px] text-[#64748B] ml-[4px]">{plan.period}</span>
									)}
								</div>

								<p className={`text-[13.5px] leading-[1.6] mb-[32px] min-h-[44px] ${isPopular ? 'text-[#93C5FD] opacity-90' : 'text-[#94A3B8]'}`}>
									{plan.description}
								</p>

								<ul className={`space-y-[16px] border-t pt-[28px] ${isPopular ? 'border-[#0033AA]' : 'border-[#1E293B]'}`}>
									{plan.features.map((feature, idx) => {

										const FeatureIcon = feature.icon;

										return (
											<li
												key={idx}
												className={`flex items-center gap-[12px] text-[13.5px] ${isPopular ? 'text-white' : 'text-[#E2E8F0]'}`}
											>
												<FeatureIcon className="text-[#3B82F6]" sx={{ fontSize: 16 }} />
												<span>{feature.label}</span>
											</li>
										);
									})}
								</ul>

								{plan.note && (
									<div className={`mt-[24px] rounded-[14px] px-[16px] py-[12px] text-[12.5px] leading-[1.5] ${isPopular ? 'bg-[#00133F] text-[#93C5FD]' : 'bg-[#0A1930] text-[#94A3B8]'}`}>
										{plan.note}
									</div>
								)}
							</div>

							<button
								onClick={() => handleSelectPlan(plan)}
								className={
									isPopular
										? `w-full h-[50px] rounded-full text-[13.5px] font-medium mt-[32px] shadow-lg transition-all duration-200 ${isSelected ? 'bg-white text-[#0052CC]' : 'bg-[#0052CC] text-white hover:bg-[#0066FF] hover:shadow-[0_4px_20px_rgba(0,82,204,0.4)]'}`
										: `w-full h-[48px] rounded-full text-[13.5px] font-medium mt-[32px] transition-all duration-200 border ${isSelected ? 'bg-[#1E293B] text-white border-[#3B82F6]' : 'bg-[#111E38] text-[#94A3B8] border-transparent hover:bg-[#1C2C4E] hover:text-white'}`
								}
							>
								{isSelected ? 'Selected' : plan.cta}
							</button>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export default Subscription;