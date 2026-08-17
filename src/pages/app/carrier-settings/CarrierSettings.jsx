import React, { useState, useEffect, useCallback, useRef } from 'react';

import { apiFetch } from "../../../lib/api";

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import Add from '@mui/icons-material/Add';
import AddCircleOutline from '@mui/icons-material/AddCircleOutlined';
import MailOutline from '@mui/icons-material/MailOutlined';
import Close from '@mui/icons-material/Close';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import BorderColorOutlined from '@mui/icons-material/BorderColorOutlined';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';

import JoditEditor from 'jodit-react';

const TABS = [
    { key: 'agreements', label: 'Agreements', icon: <DescriptionOutlined className="!text-[18px]" /> },
    { key: 'templates', label: 'Email templates', icon: <MailOutline className="!text-[18px]" /> },
];

const JODIT_CONFIG = {
    height: 300,
    toolbarAdaptive: false,
    buttons: [
        'bold', 'italic', 'underline', 'strikethrough', '|',
        'ul', 'ol', '|',
        'font', 'fontsize', 'brush', 'paragraph', '|',
        'align', '|',
        'link', 'table', '|',
        'undo', 'redo', '|',
        'eraser', 'fullsize',
    ],
    removeButtons: ['source', 'video', 'image', 'file'],
    showXPathInStatusbar: false,
    showCharsCounter: false,
    showWordsCounter: false,
    placeholder: 'Write your email content here…',
};

const AGREEMENT_HIGHLIGHTS = [
    {
        key: 'compliance',
        icon: <ShieldOutlined className="!text-[18px] !text-[#1c5dbe]" />,
        title: 'Legal Compliance',
        description: 'Certified templates that meet all DOT and federal requirements.',
    },
    {
        key: 'esign',
        icon: <BorderColorOutlined className="!text-[18px] !text-[#1c5dbe]" />,
        title: 'Smart E-Sign',
        description: 'Integrated DocuSign workflows for instant digital execution.',
    },
    {
        key: 'library',
        icon: <ContentCopyOutlined className="!text-[18px] !text-[#1c5dbe]" />,
        title: 'Global Library',
        description: 'Browse over 50+ pre-vetted industry contract variations.',
    },
];

function CarrierSettings() {

    const [activeTab, setActiveTab] = useState('agreements');

    return (

        <div className="min-h-screen bg-[#F6F7F0] p-[14px] sm:p-[20px] xl:p-[32px]">
            <div>

                {/* Header - preserved standard layout */}
                <div className="mb-6 md:mb-8">
                    <h1 className="text-[26px] sm:text-[32px] md:text-[40px] font-semibold tracking-tight text-slate-900">
                        Carrier Settings
                    </h1>

                    <p className="mt-2 text-[13.5px] sm:text-[14px] md:text-[15px] leading-relaxed text-slate-500">
                        Manage carrier agreements and the email templates sent during onboarding.
                    </p>
                </div>

                {/* Centered bounded section for Tabs and Cards */}
                <div className="max-w-[1200px] mx-auto">

                    {/* Tabs */}
                    <div className="inline-flex flex-wrap items-center gap-[4px] bg-[#EFF0ED] rounded-[12px] p-[4px] mb-[20px] md:mb-[24px]">
                        {TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-[6px] sm:gap-[8px] px-[12px] sm:px-[14px] md:px-[16px] py-[8px] md:py-[9px] rounded-[9px] text-[11px] sm:text-[11.5px] md:text-[12px] font-[600] uppercase tracking-wide transition-colors whitespace-nowrap ${
                                    activeTab === tab.key
                                        ? 'bg-white text-[#1c5dbe] shadow-sm'
                                        : 'text-[#7c8fac] hover:text-[#111827]'
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'agreements' && (
                        <AgreementsPanel />
                    )}

                    {activeTab === 'templates' && (
                        <TemplatesPanel />
                    )}

                </div>

            </div>
        </div>
    );
}
const AGREEMENTS_ENDPOINT = '/agreement-documents';

// Mirrors StoreAgreementDocumentRequest: mimes:pdf,doc,docx and max:10240 (10 MB).
const ACCEPTED_EXTENSIONS = ['pdf', 'doc', 'docx'];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function formatFileSize(bytes) {
    if (!bytes && bytes !== 0) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AgreementsPanel() {

    const [agreements, setAgreements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [busyUuid, setBusyUuid] = useState(null);

    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadDescription, setUploadDescription] = useState('');
    const [uploadError, setUploadError] = useState('');
    const [uploading, setUploading] = useState(false);

    const [editTarget, setEditTarget] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editFile, setEditFile] = useState(null);
    const [editError, setEditError] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fileInputRef = useRef(null);
    const editFileInputRef = useRef(null);

    const loadAgreements = useCallback(() => {

        setLoading(true);
        setListError('');

        const query = statusFilter ? `?status=${statusFilter}` : '';

        apiFetch(`${AGREEMENTS_ENDPOINT}${query}`)
            .then((res) => {
                // BaseController::success wraps everything in `data`, and index()
                // nests the rows under `documents` alongside `pagination`.
                setAgreements(res?.data?.documents || []);
            })
            .catch((err) => {
                console.error('Agreement documents fetch error:', err);
                setListError(err?.message || 'Failed to load agreements.');
                setAgreements([]);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [statusFilter]);

    useEffect(() => {
        loadAgreements();
    }, [loadAgreements]);

    // Shared by both the upload and the replace-file inputs.
    const validateFile = (file) => {
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (!ACCEPTED_EXTENSIONS.includes(extension)) {
            return 'The agreement must be a PDF or Word document.';
        }
        if (file.size > MAX_FILE_BYTES) {
            return 'The agreement may not be larger than 10 MB.';
        }
        return '';
    };

    const openUpload = () => {
        setUploadFile(null);
        setUploadTitle('');
        setUploadDescription('');
        setUploadError('');
        setUploadOpen(true);
    };

    const handleFileChange = (e) => {

        const file = e.target.files?.[0];

        if (!file) {
            setUploadFile(null);
            return;
        }

        const error = validateFile(file);

        if (error) {
            setUploadFile(null);
            setUploadError(error);
            return;
        }

        setUploadError('');
        setUploadFile(file);

        // Seed the title from the filename, but leave it editable.
        if (!uploadTitle.trim()) {
            setUploadTitle(file.name.replace(/\.(pdf|docx?)$/i, ''));
        }
    };

    const handleEditFileChange = (e) => {

        const file = e.target.files?.[0];

        if (!file) {
            setEditFile(null);
            return;
        }

        const error = validateFile(file);

        if (error) {
            setEditFile(null);
            setEditError(error);
            return;
        }

        setEditError('');
        setEditFile(file);
    };

    const submitUpload = () => {

        if (!uploadFile || !uploadTitle.trim()) return;

        setUploading(true);
        setUploadError('');

        const formData = new FormData();
        formData.append('title', uploadTitle.trim());
        formData.append('document', uploadFile);
        if (uploadDescription.trim()) {
            formData.append('description', uploadDescription.trim());
        }

        apiFetch(AGREEMENTS_ENDPOINT, { method: 'POST', body: formData })
            .then(() => {
                setUploadOpen(false);
                loadAgreements();
            })
            .catch((err) => {
                const fieldError = err?.errors ? Object.values(err.errors).flat()[0] : null;
                setUploadError(fieldError || err?.message || 'Upload failed.');
            })
            .finally(() => {
                setUploading(false);
            });
    };

    const openEdit = (agreement) => {
        setEditTarget(agreement);
        setEditTitle(agreement.title || '');
        setEditDescription(agreement.description || '');
        setEditFile(null);
        setEditError('');
    };

    const submitEdit = () => {

        if (!editTarget || !editTitle.trim()) return;

        setSavingEdit(true);
        setEditError('');

        const formData = new FormData();
        formData.append('title', editTitle.trim());
        formData.append('description', editDescription.trim());
        if (editFile) {
            formData.append('document', editFile);
        }

        // The update route is POST, not PUT - multipart bodies cannot be parsed
        // from a PUT by PHP, so the backend registers it as POST.
        apiFetch(`${AGREEMENTS_ENDPOINT}/${editTarget.uuid}`, {
            method: 'POST',
            body: formData,
        })
            .then(() => {
                setEditTarget(null);
                loadAgreements();
            })
            .catch((err) => {
                const fieldError = err?.errors ? Object.values(err.errors).flat()[0] : null;
                setEditError(fieldError || err?.message || 'Update failed.');
            })
            .finally(() => {
                setSavingEdit(false);
            });
    };

    const toggleStatus = (agreement) => {

        setBusyUuid(agreement.uuid);

        apiFetch(`${AGREEMENTS_ENDPOINT}/${agreement.uuid}/status`, { method: 'PATCH' })
            .then(() => {
                loadAgreements();
            })
            .catch((err) => {
                console.error('Agreement status toggle error:', err);
                setListError(err?.message || 'Could not change the status.');
            })
            .finally(() => {
                setBusyUuid(null);
            });
    };

    const submitDelete = () => {

        if (!deleteTarget) return;

        setDeleting(true);

        apiFetch(`${AGREEMENTS_ENDPOINT}/${deleteTarget.uuid}`, { method: 'DELETE' })
            .then(() => {
                setDeleteTarget(null);
                loadAgreements();
            })
            .catch((err) => {
                console.error('Agreement delete error:', err);
                setListError(err?.message || 'Could not delete the agreement.');
            })
            .finally(() => {
                setDeleting(false);
            });
    };

    return (
        <div className="rounded-[16px] border border-[#d9e1ee] bg-white shadow-sm overflow-hidden">

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[14px] px-[16px] sm:px-[20px] md:px-[24px] py-[16px] md:py-[18px] border-b border-[#d9e1ee]">
                <div className="min-w-0">
                    <div className="text-[14px] font-[700] text-[#0f172a]">Compliance Documents</div>
                    <div className="text-[12px] text-[#64748b] mt-[2px]">Legally binding agreements required for carrier activation.</div>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-[10px] shrink-0">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-[42px] rounded-[10px] border border-[#d9e1ee] bg-white px-[12px] text-[13px] font-[500] text-[#334155] outline-none flex-1 sm:flex-none min-w-[130px]"
                    >
                        <option value="">All statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    <button
                        onClick={openUpload}
                        className="flex items-center justify-center gap-[8px] bg-[#164a99] text-white text-[13px] font-[500] px-[16px] py-[11px] md:py-[15px] rounded-[10px] hover:bg-[#164a99] transition-colors flex-1 sm:flex-none whitespace-nowrap"
                    >
                        <AddCircleOutline className="!text-[18px]" />
                        Upload new agreement
                    </button>
                </div>
            </div>

            {listError && (
                <div className="px-[16px] sm:px-[20px] md:px-[24px] py-[12px] bg-[#fef2f2] text-[12.5px] text-[#dc2626] border-b border-[#fee2e2]">
                    {listError}
                </div>
            )}

            {loading && (
                <div className="flex items-center justify-center py-[48px] text-[#64748b] text-[14px] gap-[10px]">
                    <CircularProgress size={18} />
                    Loading agreements…
                </div>
            )}

            {!loading && agreements.length === 0 && (
                <div className="flex flex-col items-center justify-center px-[16px] sm:px-[20px] md:px-[24px] py-[40px] md:py-[56px] text-center">

                    <div className="w-[80px] h-[80px] md:w-[96px] md:h-[96px] rounded-[20px] bg-[#F4F7FC] flex items-center justify-center mb-[20px] md:mb-[24px]">
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 4C7.89543 4 7 4.89543 7 6V34C7 35.1046 7.89543 36 9 36H27C28.1046 36 29 35.1046 29 34V13L20 4H9Z" stroke="#CBD5E1" strokeWidth="1.6" strokeLinejoin="round"/>
                            <path d="M20 4V13H29" stroke="#CBD5E1" strokeWidth="1.6" strokeLinejoin="round"/>
                            <line x1="12" y1="20" x2="22" y2="20" stroke="#CBD5E1" strokeWidth="1.6" strokeLinecap="round"/>
                            <line x1="12" y1="25" x2="19" y2="25" stroke="#CBD5E1" strokeWidth="1.6" strokeLinecap="round"/>
                            <path d="M24 27L33 18.5C33.8 17.7 35 17.7 35.7 18.5C36.5 19.2 36.5 20.4 35.7 21.2L27 29.7L23 31L24 27Z" fill="#EAF2FF" stroke="#1c5dbe" strokeWidth="1.4" strokeLinejoin="round"/>
                        </svg>
                    </div>

                    <div className="text-[15px] font-[700] text-[#0f172a]">No agreements configured</div>
                    <div className="text-[12.5px] text-[#64748b] mt-[6px] max-w-[420px]">
                        Your library is currently empty. Upload your standard carrier contracts or use our industry templates to start the automation.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-[14px] mt-[24px] md:mt-[32px] w-full max-w-[820px]">
                        {AGREEMENT_HIGHLIGHTS.map((item) => (
                            <div key={item.key} className="text-left rounded-[14px] border border-[#eef1f6] p-[18px] bg-[#fbfcfe]">
                                <div className="w-[34px] h-[34px] rounded-[9px] bg-[#EAF2FF] flex items-center justify-center mb-[14px]">
                                    {item.icon}
                                </div>
                                <div className="text-[13px] font-[700] text-[#0f172a]">{item.title}</div>
                                <div className="text-[12px] text-[#64748b] mt-[6px] leading-[1.5]">{item.description}</div>
                            </div>
                        ))}
                    </div>

                </div>
            )}

            {!loading && agreements.length > 0 && (
                <div className="divide-y divide-[#eef1f6]">
                    {agreements.map((agreement) => (
                        <div key={agreement.uuid} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[12px] px-[16px] sm:px-[20px] md:px-[24px] py-[14px] md:py-[16px] hover:bg-[#fbfcfe]">

                            <div className="flex items-center gap-[12px] min-w-0">
                                <div className="w-[38px] h-[38px] rounded-[10px] bg-[#EBF5FF] flex items-center justify-center shrink-0">
                                    <DescriptionOutlined className="!text-[18px] !text-[#1c5dbe]" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-[8px]">
                                        <span className="text-[13px] font-[600] text-[#0f172a] truncate">
                                            {agreement.title}
                                        </span>
                                        <span
                                            className={
                                                'shrink-0 rounded-full px-[8px] py-[2px] text-[10px] font-[700] uppercase tracking-wide ' +
                                                (agreement.is_active
                                                    ? 'bg-[#ecfdf5] text-[#059669]'
                                                    : 'bg-[#f1f5f9] text-[#64748b]')
                                            }
                                        >
                                            {agreement.status}
                                        </span>
                                    </div>

                                    {agreement.description && (
                                        <div className="text-[11.5px] text-[#64748b] mt-[3px] truncate">
                                            {agreement.description}
                                        </div>
                                    )}

                                    <div className="text-[11px] text-[#94a3b8] mt-[2px]">
                                        {[
                                            agreement.file_name,
                                            formatFileSize(agreement.file_size),
                                            agreement.uploaded_by ? `by ${agreement.uploaded_by}` : null,
                                            agreement.updated_at ? `updated ${agreement.updated_at}` : null
                                        ].filter(Boolean).join(' • ')}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center flex-wrap gap-[4px] shrink-0 sm:justify-end">
                                {busyUuid === agreement.uuid ? (
                                    <CircularProgress size={18} className="mr-[8px]" />
                                ) : (
                                    <Button
                                        size="small"
                                        onClick={() => toggleStatus(agreement)}
                                        className="!text-[11px] !font-semibold !min-w-0"
                                    >
                                        {agreement.is_active ? 'Deactivate' : 'Activate'}
                                    </Button>
                                )}
                                {agreement.download_url && (
                                    <IconButton
                                        size="small"
                                        onClick={() => window.open(agreement.download_url, '_blank')}
                                        title="Download"
                                    >
                                        <DownloadOutlined className="!text-[18px] !text-[#64748b]" />
                                    </IconButton>
                                )}
                                <IconButton size="small" onClick={() => openEdit(agreement)} title="Edit">
                                    <EditOutlined className="!text-[18px] !text-[#64748b]" />
                                </IconButton>
                                <IconButton size="small" onClick={() => setDeleteTarget(agreement)} title="Delete">
                                    <DeleteOutline className="!text-[18px] !text-[#dc2626]" />
                                </IconButton>
                            </div>

                        </div>
                    ))}
                </div>
            )}

            <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle className="font-bold text-[#0f172a]">Upload agreement</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        required
                        label="Title"
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        margin="normal"
                        inputProps={{ maxLength: 255 }}
                    />
                    <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        label="Description (optional)"
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                        margin="normal"
                        inputProps={{ maxLength: 2000 }}
                    />
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full mt-[8px] py-[14px] px-[16px] rounded-[12px] border border-dashed border-[#cbd5e1] text-[13px] text-[#64748b] hover:border-[#94a3b8] hover:bg-[#f8fafc] transition-colors flex items-center justify-center gap-[8px]"
                    >
                        <UploadFileOutlined className="!text-[18px]" />
                        {uploadFile ? uploadFile.name : 'Choose a file (PDF or Word, max 10 MB)'}
                    </button>
                    {uploadError && (
                        <div className="text-[12px] text-[#dc2626] mt-[8px]">{uploadError}</div>
                    )}
                </DialogContent>
                <DialogActions className="p-4">
                    <Button onClick={() => setUploadOpen(false)} className="text-[#64748b] font-semibold">Cancel</Button>
                    <Button
                        onClick={submitUpload}
                        disabled={!uploadFile || !uploadTitle.trim() || uploading}
                        variant="contained"
                    >
                        {uploading ? <CircularProgress size={16} className="!text-white" /> : 'Upload'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit dialog - title, description and optional file replacement */}
            <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle className="font-bold text-[#0f172a]">Edit agreement</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        required
                        label="Title"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        margin="normal"
                        inputProps={{ maxLength: 255 }}
                    />
                    <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        label="Description (optional)"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        margin="normal"
                        inputProps={{ maxLength: 2000 }}
                    />
                    <input
                        ref={editFileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        style={{ display: 'none' }}
                        onChange={handleEditFileChange}
                    />
                    <button
                        onClick={() => editFileInputRef.current?.click()}
                        className="w-full mt-[8px] py-[14px] px-[16px] rounded-[12px] border border-dashed border-[#cbd5e1] text-[13px] text-[#64748b] hover:border-[#94a3b8] hover:bg-[#f8fafc] transition-colors flex items-center justify-center gap-[8px]"
                    >
                        <UploadFileOutlined className="!text-[18px]" />
                        {editFile ? editFile.name : 'Replace file (optional)'}
                    </button>
                    <div className="text-[11px] text-[#94a3b8] mt-[8px]">
                        Current file: {editTarget?.file_name || '-'}
                    </div>
                    {editError && (
                        <div className="text-[12px] text-[#dc2626] mt-[8px]">{editError}</div>
                    )}
                </DialogContent>
                <DialogActions className="p-4">
                    <Button onClick={() => setEditTarget(null)} className="text-[#64748b] font-semibold">Cancel</Button>
                    <Button
                        onClick={submitEdit}
                        disabled={!editTitle.trim() || savingEdit}
                        variant="contained"
                    >
                        {savingEdit ? <CircularProgress size={16} className="!text-white" /> : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete confirm dialog */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle className="font-bold text-[#0f172a]">Delete agreement?</DialogTitle>
                <DialogContent>
                    <p className="text-[14px] text-[#64748b]">
                        This will permanently remove <span className="font-[700] text-[#0f172a]">{deleteTarget?.title}</span>. This can't be undone.
                    </p>
                </DialogContent>
                <DialogActions className="p-4">
                    <Button onClick={() => setDeleteTarget(null)} className="text-[#64748b] font-semibold">Cancel</Button>
                    <Button onClick={submitDelete} disabled={deleting} color="error" variant="contained">
                        {deleting ? <CircularProgress size={16} className="!text-white" /> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

        </div>
    );
}

const TEMPLATES_ENDPOINT = '/email-templates';

function TemplatesPanel() {

    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [busyUuid, setBusyUuid] = useState(null);

    // Type catalogue + the placeholders each one supports, for the editor.
    const [templateTypes, setTemplateTypes] = useState([]);

    const [editorOpen, setEditorOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const loadTemplates = useCallback(() => {

        setLoading(true);
        setListError('');

        const params = new URLSearchParams();
        if (typeFilter) params.set('type', typeFilter);
        if (statusFilter) params.set('status', statusFilter);
        const query = params.toString() ? `?${params.toString()}` : '';

        apiFetch(`${TEMPLATES_ENDPOINT}${query}`)
            .then((res) => {
                // success() wraps in `data`; index() nests rows under `templates`.
                setTemplates(res?.data?.templates || []);
            })
            .catch((err) => {
                console.error('Email templates fetch error:', err);
                setListError(err?.message || 'Failed to load templates.');
                setTemplates([]);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [typeFilter, statusFilter]);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    // Fetched once - the catalogue is static config, not per-template data.
    useEffect(() => {
        apiFetch(`${TEMPLATES_ENDPOINT}/variables`)
            .then((res) => {
                setTemplateTypes(Array.isArray(res?.data) ? res.data : []);
            })
            .catch((err) => {
                console.error('Template variables fetch error:', err);
                setTemplateTypes([]);
            });
    }, []);

    const openNew = () => {
        setEditingTemplate(null);
        setEditorOpen(true);
    };

    const openEdit = (template) => {
        setEditingTemplate(template);
        setEditorOpen(true);
    };

    const toggleStatus = (template) => {

        setBusyUuid(template.uuid);

        apiFetch(`${TEMPLATES_ENDPOINT}/${template.uuid}/status`, { method: 'PATCH' })
            .then(() => {
                loadTemplates();
            })
            .catch((err) => {
                console.error('Template status toggle error:', err);
                setListError(err?.message || 'Could not change the status.');
            })
            .finally(() => {
                setBusyUuid(null);
            });
    };

    const submitDelete = () => {

        if (!deleteTarget) return;

        setDeleting(true);

        apiFetch(`${TEMPLATES_ENDPOINT}/${deleteTarget.uuid}`, { method: 'DELETE' })
            .then(() => {
                setDeleteTarget(null);
                loadTemplates();
            })
            .catch((err) => {
                console.error('Template delete error:', err);
                setListError(err?.message || 'Could not delete the template.');
            })
            .finally(() => {
                setDeleting(false);
            });
    };

    return (
        <div className="rounded-[16px] border border-[#d9e1ee] bg-white shadow-sm overflow-hidden">

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[14px] px-[16px] sm:px-[20px] md:px-[24px] py-[16px] md:py-[18px] border-b border-[#d9e1ee]">
                <div className="min-w-0">
                    <div className="text-[14px] font-[700] text-[#0f172a]">Email templates</div>
                    <div className="text-[12px] text-[#64748b] mt-[2px]">Emails sent automatically during carrier onboarding.</div>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-[10px] shrink-0">
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="h-[42px] rounded-[10px] border border-[#d9e1ee] bg-white px-[12px] text-[13px] font-[500] text-[#334155] outline-none flex-1 sm:flex-none min-w-[120px]"
                    >
                        <option value="">All types</option>
                        {templateTypes.map((t) => (
                            <option key={t.type} value={t.type}>{t.label}</option>
                        ))}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-[42px] rounded-[10px] border border-[#d9e1ee] bg-white px-[12px] text-[13px] font-[500] text-[#334155] outline-none flex-1 sm:flex-none min-w-[120px]"
                    >
                        <option value="">All statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    <button
                        onClick={openNew}
                        className="flex items-center justify-center gap-[8px] bg-[#164a99] text-white text-[13px] font-[500] px-[16px] py-[11px] md:py-[15px] rounded-[10px] hover:bg-[#164a99] transition-colors flex-1 sm:flex-none whitespace-nowrap"
                    >
                        <Add className="!text-[18px]" />
                        New template
                    </button>
                </div>
            </div>

            {listError && (
                <div className="px-[16px] sm:px-[20px] md:px-[24px] py-[12px] bg-[#fef2f2] text-[12.5px] text-[#dc2626] border-b border-[#fee2e2]">
                    {listError}
                </div>
            )}

            {loading && (
                <div className="flex items-center justify-center py-[48px] text-[#64748b] text-[14px] gap-[10px]">
                    <CircularProgress size={18} />
                    Loading templates…
                </div>
            )}

            {!loading && templates.length === 0 && (
                <div className="flex flex-col items-center justify-center py-[36px] md:py-[48px] text-center">
                    <MailOutline className="!text-[32px] !text-[#cbd5e1] mb-[10px]" />
                    <div className="text-[14px] font-[600] text-[#0f172a]">No templates yet</div>
                    <div className="text-[12px] text-[#64748b] mt-[4px]">Create your first email template to get started.</div>
                </div>
            )}

            {!loading && templates.length > 0 && (
                <div className="divide-y divide-[#eef1f6]">
                    {templates.map((template) => (
                        <div key={template.uuid} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[12px] px-[16px] sm:px-[20px] md:px-[24px] py-[14px] md:py-[16px] hover:bg-[#fbfcfe]">

                            <div className="flex items-center gap-[12px] min-w-0">
                                <div className="w-[38px] h-[38px] rounded-[10px] bg-[#fdf2e9] flex items-center justify-center shrink-0">
                                    <MailOutline className="!text-[18px] !text-[#d97706]" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-[8px] flex-wrap">
                                        <span className="text-[13px] font-[600] text-[#0f172a] truncate">
                                            {template.name}
                                        </span>
                                        <span
                                            className={
                                                'shrink-0 rounded-full px-[8px] py-[2px] text-[10px] font-[700] uppercase tracking-wide ' +
                                                (template.is_active
                                                    ? 'bg-[#ecfdf5] text-[#059669]'
                                                    : 'bg-[#f1f5f9] text-[#64748b]')
                                            }
                                        >
                                            {template.status}
                                        </span>
                                        {template.is_default && (
                                            <span className="shrink-0 rounded-full bg-[#eff6ff] px-[8px] py-[2px] text-[10px] font-[700] uppercase tracking-wide text-[#2563eb]">
                                                Default
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[11px] text-[#94a3b8] mt-[2px] truncate">{template.subject}</div>
                                    <div className="text-[11px] text-[#94a3b8] mt-[2px]">
                                        {[
                                            template.type_label,
                                            template.updated_by ? `by ${template.updated_by}` : null,
                                            template.updated_at ? `updated ${template.updated_at}` : null
                                        ].filter(Boolean).join(' • ')}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center flex-wrap gap-[4px] shrink-0 sm:justify-end">
                                {busyUuid === template.uuid ? (
                                    <CircularProgress size={18} className="mr-[8px]" />
                                ) : (
                                    <Button
                                        size="small"
                                        onClick={() => toggleStatus(template)}
                                        className="!text-[11px] !font-semibold !min-w-0"
                                    >
                                        {template.is_active ? 'Deactivate' : 'Activate'}
                                    </Button>
                                )}
                                <IconButton size="small" onClick={() => openEdit(template)} title="Edit">
                                    <EditOutlined className="!text-[18px] !text-[#64748b]" />
                                </IconButton>
                                <IconButton size="small" onClick={() => setDeleteTarget(template)} title="Delete">
                                    <DeleteOutline className="!text-[18px] !text-[#dc2626]" />
                                </IconButton>
                            </div>

                        </div>
                    ))}
                </div>
            )}

            {editorOpen && (
                <TemplateEditorDialog
                    template={editingTemplate}
                    templateTypes={templateTypes}
                    onClose={() => setEditorOpen(false)}
                    onSaved={() => {
                        setEditorOpen(false);
                        loadTemplates();
                    }}
                />
            )}

            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle className="font-bold text-[#0f172a]">Delete template?</DialogTitle>
                <DialogContent>
                    <p className="text-[14px] text-[#64748b]">
                        This will permanently remove <span className="font-[700] text-[#0f172a]">{deleteTarget?.name}</span>. This can't be undone.
                    </p>
                </DialogContent>
                <DialogActions className="p-4">
                    <Button onClick={() => setDeleteTarget(null)} className="text-[#64748b] font-semibold">Cancel</Button>
                    <Button onClick={submitDelete} disabled={deleting} color="error" variant="contained">
                        {deleting ? <CircularProgress size={16} className="!text-white" /> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

        </div>
    );
}

function TemplateEditorDialog({ template, templateTypes, onClose, onSaved }) {

    const isEdit = Boolean(template?.uuid);

    const [name, setName] = useState(template?.name || '');
    const [subject, setSubject] = useState(template?.subject || '');
    // The API field is body_html, not body - the old code read a key that the
    // resource never returns, so editing an existing template opened blank.
    const [body, setBody] = useState(template?.body_html || '');
    const [type, setType] = useState(template?.type || 'custom');
    const [isDefault, setIsDefault] = useState(Boolean(template?.is_default));
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    const [preview, setPreview] = useState(null);
    const [previewing, setPreviewing] = useState(false);

    const editorRef = useRef(null);

    // Placeholders offered for the chosen type. An existing template carries its
    // own list; otherwise fall back to the catalogue for the selected type.
    const variables =
        template?.available_variables?.length
            ? template.available_variables
            : (templateTypes.find((t) => t.type === type)?.variables || []);

    const insertVariable = (placeholder) => {
        setBody((prev) => `${prev || ''}${placeholder}`);
    };

    const submitSave = () => {

        if (!name.trim() || !subject.trim() || !body.trim()) return;

        setSaving(true);
        setSaveError('');

        const payload = {
            name: name.trim(),
            subject: subject.trim(),
            body_html: body,
            type,
            is_default: isDefault,
        };

        // store is POST /email-templates, update is PUT /email-templates/{uuid}.
        // Both take JSON - unlike the agreement documents, there is no file here.
        const request = isEdit
            ? apiFetch(`${TEMPLATES_ENDPOINT}/${template.uuid}`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            })
            : apiFetch(TEMPLATES_ENDPOINT, {
                method: 'POST',
                body: JSON.stringify(payload),
            });

        request
            .then(() => {
                onSaved();
            })
            .catch((err) => {
                const fieldError = err?.errors ? Object.values(err.errors).flat()[0] : null;
                setSaveError(fieldError || err?.message || 'Could not save the template.');
            })
            .finally(() => {
                setSaving(false);
            });
    };

    // Preview renders server-side with sample values, so it only works once the
    // template exists.
    const runPreview = () => {

        if (!isEdit) return;

        setPreviewing(true);
        setSaveError('');

        apiFetch(`${TEMPLATES_ENDPOINT}/${template.uuid}/preview`, {
            method: 'POST',
            body: JSON.stringify({ variables: {} }),
        })
            .then((res) => {
                setPreview(res?.data || null);
            })
            .catch((err) => {
                setSaveError(err?.message || 'Could not generate a preview.');
            })
            .finally(() => {
                setPreviewing(false);
            });
    };

    return (
        <Dialog open onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '20px', overflow: 'hidden' } }}>

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-[18px] sm:px-[22px] md:px-[28px] py-[16px] sm:py-[18px] md:py-[20px] bg-white border-b border-[#eef1f6]">
                <div className="flex items-center gap-[10px] sm:gap-[12px] md:gap-[14px] min-w-0">
                    <div className="w-[36px] h-[36px] md:w-[40px] md:h-[40px] rounded-[12px] bg-[#eaf2ff] flex items-center justify-center shrink-0">
                        <MailOutline className="!text-[19px] !text-[#1c5dbe]" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[14.5px] md:text-[16px] font-[700] text-[#0f172a] truncate">
                            {isEdit ? 'Edit email template' : 'New email template'}
                        </div>
                        <div className="text-[11.5px] md:text-[12.5px] text-[#94a3b8] mt-[1px] truncate">
                            Sent automatically during carrier onboarding
                        </div>
                    </div>
                </div>
                <IconButton size="small" onClick={onClose}>
                    <Close className="!text-[19px] !text-[#64748b]" />
                </IconButton>
            </div>

            <div className="px-[18px] sm:px-[22px] md:px-[28px] py-[20px] sm:py-[24px] md:py-[26px] bg-white overflow-y-auto" style={{ maxHeight: 620 }}>

                <div className="mb-[20px] md:mb-[24px]">
                    <label className="block text-[11px] font-[700] text-[#94a3b8] uppercase tracking-[0.08em] mb-[8px]">
                        Template name
                    </label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Onboarding welcome email"
                        className="w-full text-[15px] font-[600] text-[#0f172a] placeholder:text-[#cbd5e1] placeholder:font-[400] border border-[#e2e8f0] focus:border-[#1c5dbe] outline-none rounded-[10px] px-[14px] py-[11px] transition-colors bg-[#fbfcfe]"
                    />
                </div>

                <div className="mb-[22px] md:mb-[28px]">
                    <label className="block text-[11px] font-[700] text-[#94a3b8] uppercase tracking-[0.08em] mb-[8px]">
                        Subject line
                    </label>
                    <input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Welcome aboard"
                        className="w-full text-[14px] text-[#0f172a] placeholder:text-[#cbd5e1] border border-[#e2e8f0] focus:border-[#1c5dbe] outline-none rounded-[10px] px-[14px] py-[11px] transition-colors bg-[#fbfcfe]"
                    />
                </div>

                <div className="mb-[22px] md:mb-[28px]">
                    <label className="block text-[11px] font-[700] text-[#94a3b8] uppercase tracking-[0.08em] mb-[8px]">
                        Template type
                    </label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="w-full text-[14px] text-[#0f172a] border border-[#e2e8f0] focus:border-[#1c5dbe] outline-none rounded-[10px] px-[14px] py-[11px] transition-colors bg-[#fbfcfe]"
                    >
                        {templateTypes.length === 0 && <option value={type}>{type}</option>}
                        {templateTypes.map((t) => (
                            <option key={t.type} value={t.type}>{t.label}</option>
                        ))}
                    </select>

                    <label className="mt-[12px] flex items-center gap-[8px] text-[12.5px] text-[#334155]">
                        <input
                            type="checkbox"
                            checked={isDefault}
                            onChange={(e) => setIsDefault(e.target.checked)}
                        />
                        Use as the default template for this type
                    </label>
                </div>

                <label className="block text-[11px] font-[700] text-[#94a3b8] uppercase tracking-[0.08em] mb-[10px]">
                    Email body
                </label>

                {variables.length > 0 && (
                    <div className="mb-[10px] flex flex-wrap items-center gap-[6px]">
                        <span className="text-[11px] text-[#94a3b8]">Insert:</span>
                        {variables.map((v) => (
                            <button
                                key={v.name}
                                type="button"
                                onClick={() => insertVariable(v.placeholder)}
                                title={v.description}
                                className="rounded-[6px] border border-[#e2e8f0] bg-[#f8fafc] px-[8px] py-[3px] text-[11px] font-[600] text-[#334155] hover:border-[#1c5dbe] hover:bg-[#eff6ff]"
                            >
                                {v.placeholder}
                            </button>
                        ))}
                    </div>
                )}

                <div className="rounded-[10px] border border-[#e2e8f0] overflow-hidden">
                    <JoditEditor
                        ref={editorRef}
                        value={body}
                        config={JODIT_CONFIG}
                        onBlur={(newContent) => setBody(newContent)}
                    />
                </div>

                {saveError && (
                    <div className="mt-[12px] text-[12px] text-[#dc2626]">{saveError}</div>
                )}

                {preview && (
                    <div className="mt-[20px] rounded-[10px] border border-[#e2e8f0] bg-[#fbfcfe] p-[16px]">
                        <div className="text-[11px] font-[700] uppercase tracking-[0.08em] text-[#94a3b8] mb-[8px]">
                            Preview (sample values)
                        </div>
                        <div className="text-[13px] font-[700] text-[#0f172a] mb-[10px]">
                            {preview.subject}
                        </div>
                        <div
                            className="text-[13px] text-[#334155] leading-[1.6]"
                            dangerouslySetInnerHTML={{ __html: preview.body_html }}
                        />
                    </div>
                )}

            </div>

            <DialogActions className="p-4 border-t border-[#eef1f6] bg-white">
                {isEdit && (
                    <Button
                        onClick={runPreview}
                        disabled={previewing}
                        className="!mr-auto text-[#1c5dbe] font-semibold"
                    >
                        {previewing ? <CircularProgress size={16} /> : 'Preview'}
                    </Button>
                )}
                <Button onClick={onClose} className="text-[#64748b] font-semibold">Cancel</Button>
                <Button
                    onClick={submitSave}
                    disabled={!name.trim() || !subject.trim() || !body.trim() || saving}
                    variant="contained"
                >
                    {saving ? <CircularProgress size={16} className="!text-white" /> : 'Save template'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default CarrierSettings;