import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import AdminLayout from '../../components/AdminLayout';
import { DISTRICTS, getMohAreas } from '../../data/sriLankaLocations';
import { formatDisplayDate, safeRenderText, isHighRiskMother, normalizeRiskStatus } from '../../utils/securityValidators';
import {
  generateNationalSummaryPDF,
  generateMOHAdminsPDF,
  generateHospitalsPDF,
  generateMidwivesPDF,
  generateMothersPDF,
  exportToCSV
} from '../../utils/pdfReportGenerator';

const ReportsAndDocuments = () => {
  // Data States
  const [loading, setLoading] = useState(true);
  const [mohAdmins, setMohAdmins] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [midwives, setMidwives] = useState([]);
  const [mothers, setMothers] = useState([]);

  // Active Report Selection & Filters
  const [activeReportType, setActiveReportType] = useState('national'); // 'national' | 'moh' | 'hospital' | 'midwives' | 'mothers' | 'high_risk'
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedMohArea, setSelectedMohArea] = useState('All');
  const [selectedRisk, setSelectedRisk] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI & Feedback States
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Available MOH areas based on district
  const availableMohAreas = useMemo(() => {
    if (selectedDistrict === 'All') return [];
    return getMohAreas(selectedDistrict);
  }, [selectedDistrict]);

  const showToast = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  // Fetch all collections in parallel
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [mohSnap, hospSnap, midSnap, mtrSnap] = await Promise.all([
        getDocs(collection(db, 'moh_admins')),
        getDocs(collection(db, 'hospital_admins')),
        getDocs(collection(db, 'midwives')),
        getDocs(collection(db, 'mothers'))
      ]);

      // Map MOH Admins
      const mohList = mohSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          fullName: safeRenderText(data.fullName, 'නොදක්වා ඇත'),
          nic: safeRenderText(data.nic, '—'),
          slmcNumber: safeRenderText(data.slmcNumber, '—'),
          email: safeRenderText(data.email, '—'),
          phone: safeRenderText(data.phone, '—'),
          officePhone: safeRenderText(data.officePhone, '—'),
          district: safeRenderText(data.district, '—'),
          mohArea: safeRenderText(data.mohArea, '—'),
          status: safeRenderText(data.status, 'Active'),
          appointmentDate: formatDisplayDate(data.appointmentDate, '—')
        };
      });

      // Map Hospital Admins
      const hospList = hospSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          hospitalName: safeRenderText(data.hospitalName, 'නොදක්වා ඇත'),
          hospitalType: safeRenderText(data.hospitalType, 'District General Hospital'),
          district: safeRenderText(data.district, '—'),
          city: safeRenderText(data.city, '—'),
          adminName: safeRenderText(data.adminName, '—'),
          email: safeRenderText(data.email, '—'),
          hospitalPhone: safeRenderText(data.hospitalPhone, '—'),
          adminPhone: safeRenderText(data.adminPhone, '—'),
          maternityWardCapacity: safeRenderText(data.maternityWardCapacity, '0'),
          hasNicu: safeRenderText(data.hasNicu, 'Yes'),
          hasBloodBank: safeRenderText(data.hasBloodBank, 'Yes'),
          hasLabourRoom: safeRenderText(data.hasLabourRoom, 'Yes'),
          status: safeRenderText(data.status, 'Active')
        };
      });

      // Map Midwives
      const midList = midSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          fullName: safeRenderText(data.fullName, 'නොදක්වා ඇත'),
          nic: safeRenderText(data.nic, '—'),
          employeeId: safeRenderText(data.employeeId, '—'),
          phone: safeRenderText(data.phone, '—'),
          email: safeRenderText(data.email, '—'),
          mohArea: safeRenderText(data.mohArea, '—'),
          district: safeRenderText(data.district, '—'),
          serviceArea: safeRenderText(data.serviceArea, '—'),
          gnDivisions: safeRenderText(data.gnDivisions, '—'),
          designation: safeRenderText(data.designation, 'Public Health Midwife (PHM)'),
          status: safeRenderText(data.status, 'Active'),
          appointmentDate: formatDisplayDate(data.appointmentDate, '—')
        };
      });

      // Map Mothers with universal High Risk check
      const mtrList = mtrSnap.docs.map(d => {
        const data = d.data();
        const isHigh = isHighRiskMother(data);
        return {
          id: d.id,
          ...data,
          fullName: safeRenderText(data.fullName, 'නොදක්වා ඇත'),
          nic: safeRenderText(data.nic, '—'),
          phone: safeRenderText(data.phone, '—'),
          emergencyPhone: safeRenderText(data.emergencyPhone || data.husbandPhone, '—'),
          address: safeRenderText(data.address, '—'),
          bloodGroup: safeRenderText(data.bloodGroup, '—'),
          mohArea: safeRenderText(data.mohArea, '—'),
          district: safeRenderText(data.district, '—'),
          serviceArea: safeRenderText(data.serviceArea || data.phmArea, '—'),
          midwifeName: safeRenderText(data.midwifeName, '—'),
          hospitalName: safeRenderText(data.hospitalName, '—'),
          riskStatus: isHigh ? 'High Risk' : normalizeRiskStatus(data),
          isHighRisk: isHigh,
          notes: safeRenderText(data.notes || data.riskNotes || data.riskReason, '—'),
          edd: formatDisplayDate(data.edd, 'නොදක්වා ඇත'),
          gestationalAge: safeRenderText(data.gestationalAge || data.weeks, '—'),
          age: safeRenderText(data.age, '—')
        };
      });

      setMohAdmins(mohList);
      setHospitals(hospList);
      setMidwives(midList);
      setMothers(mtrList);
    } catch (error) {
      console.error("Error fetching data for reports:", error);
      showToast("දත්ත ලබා ගැනීමේ දෝෂයක් සිදු විය: " + error.message, 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtered Datasets based on user selection
  const filteredMOH = useMemo(() => {
    return mohAdmins.filter(adm => {
      const matchDistrict = selectedDistrict === 'All' || adm.district === selectedDistrict;
      const matchMoh = selectedMohArea === 'All' || adm.mohArea === selectedMohArea;
      const matchSearch = searchTerm === '' || 
        adm.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adm.nic.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adm.mohArea.toLowerCase().includes(searchTerm.toLowerCase());
      return matchDistrict && matchMoh && matchSearch;
    });
  }, [mohAdmins, selectedDistrict, selectedMohArea, searchTerm]);

  const filteredHospitals = useMemo(() => {
    return hospitals.filter(hsp => {
      const matchDistrict = selectedDistrict === 'All' || hsp.district === selectedDistrict;
      const matchSearch = searchTerm === '' || 
        hsp.hospitalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hsp.adminName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hsp.city.toLowerCase().includes(searchTerm.toLowerCase());
      return matchDistrict && matchSearch;
    });
  }, [hospitals, selectedDistrict, searchTerm]);

  const filteredMidwives = useMemo(() => {
    return midwives.filter(mid => {
      const matchDistrict = selectedDistrict === 'All' || mid.district === selectedDistrict;
      const matchMoh = selectedMohArea === 'All' || mid.mohArea === selectedMohArea;
      const matchSearch = searchTerm === '' || 
        mid.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mid.nic.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mid.mohArea.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mid.serviceArea.toLowerCase().includes(searchTerm.toLowerCase());
      return matchDistrict && matchMoh && matchSearch;
    });
  }, [midwives, selectedDistrict, selectedMohArea, searchTerm]);

  const filteredMothers = useMemo(() => {
    return mothers.filter(m => {
      const matchDistrict = selectedDistrict === 'All' || m.district === selectedDistrict;
      const matchMoh = selectedMohArea === 'All' || m.mohArea === selectedMohArea;
      const isHigh = isHighRiskMother(m) || m.isHighRisk === true || (m.riskStatus || '').toLowerCase().includes('high');
      
      let matchRisk = true;
      if (activeReportType === 'high_risk') {
        matchRisk = isHigh;
      } else if (selectedRisk === 'High Risk' || selectedRisk === 'High-Risk') {
        matchRisk = isHigh;
      } else if (selectedRisk === 'Normal') {
        matchRisk = !isHigh;
      }

      const matchSearch = searchTerm === '' || 
        m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.nic.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.mohArea.toLowerCase().includes(searchTerm.toLowerCase());
      return matchDistrict && matchMoh && matchRisk && matchSearch;
    });
  }, [mothers, selectedDistrict, selectedMohArea, selectedRisk, activeReportType, searchTerm]);

  // Analytics for Strategic Report
  const districtCounts = useMemo(() => {
    const counts = {};
    mothers.forEach(m => {
      if (m.district && m.district !== '—') {
        counts[m.district] = (counts[m.district] || 0) + 1;
      }
    });
    return counts;
  }, [mothers]);

  const trimesterCounts = useMemo(() => {
    let first = 0, second = 0, third = 0;
    mothers.forEach(m => {
      const w = parseInt(m.gestationalAge, 10);
      if (!isNaN(w)) {
        if (w <= 12) first++;
        else if (w <= 27) second++;
        else third++;
      }
    });
    return { first, second, third };
  }, [mothers]);

  const highRiskTotal = useMemo(() => {
    return mothers.filter(m => isHighRiskMother(m) || m.isHighRisk === true || (m.riskStatus || '').toLowerCase().includes('high')).length;
  }, [mothers]);

  // Handle PDF Export
  const handleDownloadPDF = () => {
    setGeneratingPdf(true);
    try {
      const filterInfo = {
        district: selectedDistrict,
        mohArea: selectedMohArea,
        riskStatus: activeReportType === 'high_risk' ? 'High Risk' : selectedRisk
      };

      if (activeReportType === 'national') {
        generateNationalSummaryPDF({
          totalMOH: mohAdmins.length,
          totalHospitals: hospitals.length,
          totalMidwives: midwives.length,
          totalMothers: mothers.length,
          highRiskCount: highRiskTotal,
          districtCounts,
          trimesterCounts
        });
        showToast("ජාතික මාතෘ සංඛ්‍යාලේඛන PDF වාර්තාව සාර්ථකව බාගත කරන ලදී!", 'success');
      } else if (activeReportType === 'moh') {
        generateMOHAdminsPDF(filteredMOH, filterInfo);
        showToast("MOH නිලධාරීන්ගේ PDF නාමාවලිය සාර්ථකව බාගත කරන ලදී!", 'success');
      } else if (activeReportType === 'hospital') {
        generateHospitalsPDF(filteredHospitals, filterInfo);
        showToast("ජාතික රෝහල් ජාලයේ PDF වාර්තාව සාර්ථකව බාගත කරන ලදී!", 'success');
      } else if (activeReportType === 'midwives') {
        generateMidwivesPDF(filteredMidwives, filterInfo);
        showToast("පවුල් සෞඛ්‍ය නිලධාරීන්ගේ PDF නාමාවලිය සාර්ථකව බාගත කරන ලදී!", 'success');
      } else if (activeReportType === 'mothers' || activeReportType === 'high_risk') {
        generateMothersPDF(filteredMothers, filterInfo);
        showToast(`${activeReportType === 'high_risk' ? 'අධි අවදානම් මව්වරුන්ගේ' : 'මව්වරුන්ගේ'} PDF වාර්තාව සාර්ථකව බාගත කරන ලදී!`, 'success');
      }
    } catch (err) {
      console.error("PDF Generation Error:", err);
      showToast("PDF වාර්තාව සැකසීමේ දෝෂයක් සිදු විය: " + err.message, 'error');
    }
    setGeneratingPdf(false);
  };

  // Handle CSV Export
  const handleExportCSV = () => {
    if (activeReportType === 'moh') {
      const headers = [
        { label: 'MOH Officer Name', key: 'fullName' },
        { label: 'NIC Number', key: 'nic' },
        { label: 'SLMC Registration', key: 'slmcNumber' },
        { label: 'MOH Area', key: 'mohArea' },
        { label: 'District', key: 'district' },
        { label: 'Official Email', key: 'email' },
        { label: 'Phone', key: 'phone' },
        { label: 'Office Phone', key: 'officePhone' },
        { label: 'Status', key: 'status' }
      ];
      exportToCSV('Maatha_MOH_Admins', filteredMOH, headers);
      showToast("MOH ලේඛනය CSV ගොනුවක් ලෙස බාගත කරන ලදී!", 'success');
    } else if (activeReportType === 'hospital') {
      const headers = [
        { label: 'Hospital Name', key: 'hospitalName' },
        { label: 'Hospital Type', key: 'hospitalType' },
        { label: 'District', key: 'district' },
        { label: 'City', key: 'city' },
        { label: 'Medical Superintendent', key: 'adminName' },
        { label: 'Email', key: 'email' },
        { label: 'Hospital Hotline', key: 'hospitalPhone' },
        { label: 'Maternity Ward Capacity', key: 'maternityWardCapacity' },
        { label: 'Labour Room', key: 'hasLabourRoom' },
        { label: 'NICU', key: 'hasNicu' },
        { label: 'Blood Bank', key: 'hasBloodBank' },
        { label: 'Status', key: 'status' }
      ];
      exportToCSV('Maatha_Hospital_Network', filteredHospitals, headers);
      showToast("රෝහල් ජාලය CSV ගොනුවක් ලෙස බාගත කරන ලදී!", 'success');
    } else if (activeReportType === 'midwives') {
      const headers = [
        { label: 'Midwife Name', key: 'fullName' },
        { label: 'NIC Number', key: 'nic' },
        { label: 'Employee / SLMC ID', key: 'employeeId' },
        { label: 'MOH Area', key: 'mohArea' },
        { label: 'District', key: 'district' },
        { label: 'Service Division', key: 'serviceArea' },
        { label: 'GN Divisions', key: 'gnDivisions' },
        { label: 'Contact Phone', key: 'phone' },
        { label: 'Email', key: 'email' },
        { label: 'Duty Status', key: 'status' }
      ];
      exportToCSV('Maatha_Midwives_Registry', filteredMidwives, headers);
      showToast("පවුල් සෞඛ්‍ය නිලධාරීන්ගේ දත්ත CSV ලෙස බාගත කරන ලදී!", 'success');
    } else if (activeReportType === 'mothers' || activeReportType === 'high_risk') {
      const headers = [
        { label: 'Mother Full Name', key: 'fullName' },
        { label: 'NIC Number', key: 'nic' },
        { label: 'Age', key: 'age' },
        { label: 'Blood Group', key: 'bloodGroup' },
        { label: 'Gestational Age (Weeks)', key: 'gestationalAge' },
        { label: 'EDD', key: 'edd' },
        { label: 'District', key: 'district' },
        { label: 'MOH Area', key: 'mohArea' },
        { label: 'Assigned Midwife', key: 'midwifeName' },
        { label: 'Primary Contact', key: 'phone' },
        { label: 'Emergency Contact', key: 'emergencyPhone' },
        { label: 'Risk Category', key: 'riskStatus' },
        { label: 'Clinical Notes', key: 'notes' }
      ];
      exportToCSV(activeReportType === 'high_risk' ? 'Maatha_High_Risk_Mothers' : 'Maatha_Maternal_Registry', filteredMothers, headers);
      showToast("මව්වරුන්ගේ දත්ත CSV ලෙස බාගත කරන ලදී!", 'success');
    } else {
      showToast("ජාතික වාර්තාව සඳහා කරුණාකර PDF Export භාවිතා කරන්න.", 'info');
    }
  };

  // Trigger Printable Modal
  const handlePrintPreview = () => {
    setShowPrintModal(true);
  };

  // Report Definition Metadata
  const reportCategories = [
    {
      id: 'national',
      titleSi: 'ජාතික මාතෘ සෞඛ්‍ය සංඛ්‍යාලේඛන වාර්තාව',
      titleEn: 'National Maternal Strategic Dossier',
      icon: '🏛️',
      badge: 'Executive Summary',
      desc: 'දිස්ත්‍රික් ව්‍යාප්තිය, ත්‍රෛමාසික අවධීන්, සෞඛ්‍ය යටිතල පහසුකම් සහ ජාතික මට්ටමේ විශ්ලේෂණය.'
    },
    {
      id: 'moh',
      titleSi: 'MOH පරිපාලන හා ප්‍රදේශ ලේඛනය',
      titleEn: 'MOH Admin Officers & Areas',
      icon: '🏥',
      badge: `${filteredMOH.length} Offices`,
      desc: 'සියලුම සෞඛ්‍ය වෛද්‍ය නිලධාරී (MOH) කාර්යාල, වගකිවයුතු වෛද්‍යවරුන් සහ සේවා බලප්‍රදේශ ලේඛනය.'
    },
    {
      id: 'hospital',
      titleSi: 'ජාතික රෝහල් ජාලය සහ පහසුකම්',
      titleEn: 'Hospitals & Clinical Facilities',
      icon: '🏢',
      badge: `${filteredHospitals.length} Hospitals`,
      desc: 'රෝහල් ප්‍රවර්ග, මාතෘ වාට්ටු ධාරිතාව, ප්‍රසූතාගාර (Labour Rooms), NICU සහ Blood Bank පහසුකම්.'
    },
    {
      id: 'midwives',
      titleSi: 'පවුල් සෞඛ්‍ය සේවා නිලධාරී නාමාවලිය',
      titleEn: 'Midwives (PHM) Field Directory',
      icon: '👩‍⚕️',
      badge: `${filteredMidwives.length} Midwives`,
      desc: 'ක්ෂේත්‍ර පවුල් සෞඛ්‍ය සේවා නිලධාරිනියන්ගේ (PHM) ලියාපදිංචි අංක, MOH කලාප හා වසම් ආවරණය.'
    },
    {
      id: 'mothers',
      titleSi: 'ජාතික මව්වරුන්ගේ ලේඛනය',
      titleEn: 'National Maternal Registry',
      icon: '🤰',
      badge: `${filteredMothers.length} Mothers`,
      desc: 'ගර්භණී මව්වරුන්ගේ සම්පූර්ණ තොරතුරු, රුධිර ගණ, ගර්භ සති, අපේක්ෂිත ප්‍රසූත දිනයන් හා හදිසි අංක.'
    },
    {
      id: 'high_risk',
      titleSi: 'අධි අවදානම් මව්වරුන්ගේ හදිසි වාර්තාව',
      titleEn: 'High-Risk Critical Alert List',
      icon: '🚨',
      badge: `${highRiskTotal} Critical`,
      badgeColor: 'bg-red-100 text-red-700 border-red-200',
      desc: 'විශේෂ සායනික අධීක්ෂණය සහ හදිසි රෝහල් සත්කාර අවශ්‍ය අධි අවදානම් මව්වරුන්ගේ විශේෂ ලේඛනය.'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-8 pb-16 max-w-7xl mx-auto px-3 sm:px-6">
        
        {/* Toast Alert Notification */}
        {message && (
          <div className={`p-4 rounded-2xl flex items-center justify-between shadow-xl border animate-in slide-in-from-top duration-300 ${
            messageType === 'success' 
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200 shadow-emerald-100' 
              : messageType === 'info'
              ? 'bg-blue-50 text-blue-900 border-blue-200 shadow-blue-100'
              : 'bg-red-50 text-red-900 border-red-200 shadow-red-100'
          }`}>
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{messageType === 'success' ? '✅' : messageType === 'info' ? 'ℹ️' : '⚠️'}</span>
              <p className="font-bold text-sm sm:text-base">{message}</p>
            </div>
            <button onClick={() => setMessage('')} className="text-slate-400 hover:text-slate-700 font-black p-1">✕</button>
          </div>
        )}

        {/* Top Header Card (Blue & White Clinical Look) */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-950/15 border border-blue-800/40 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center space-x-2 text-blue-200 text-xs sm:text-sm font-bold tracking-widest uppercase mb-1">
                <span>🛡️ Ministry of Health • National Health Intelligence</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                <span>නිල ලේඛන සහ වාර්තා කේන්ද්‍රය</span>
              </h1>
              <p className="text-blue-100/90 text-sm sm:text-base font-medium mt-1.5 max-w-2xl">
                MOH ප්‍රදේශ, රෝහල් ජාලය, පවුල් සෞඛ්‍ය නිලධාරීන් සහ මව්වරුන්ගේ සියලුම නිල දත්ත වාර්තා සහ PDF ලේඛන මෙතැනින් උත්පාදනය කර බාගත කරගන්න.
              </p>
            </div>

            {/* Quick Export Action Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleDownloadPDF}
                disabled={generatingPdf || loading}
                className="px-5 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm sm:text-base shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {generatingPdf ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                    <span>වාර්තාව සකසමින්...</span>
                  </>
                ) : (
                  <>
                    <span className="text-lg">📥</span>
                    <span>Download Official PDF</span>
                  </>
                )}
              </button>

              <button
                onClick={handlePrintPreview}
                disabled={loading}
                className="px-4 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl font-bold text-sm sm:text-base backdrop-blur-md transition-all flex items-center gap-2 active:scale-95"
              >
                <span>🖨️</span>
                <span>Print Dossier</span>
              </button>

              {activeReportType !== 'national' && (
                <button
                  onClick={handleExportCSV}
                  disabled={loading}
                  className="px-4 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-sm sm:text-base shadow-md transition-all flex items-center gap-2 active:scale-95"
                >
                  <span>📊</span>
                  <span>CSV Export</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Report Category Selection Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span>වාර්තා ප්‍රවර්ගය තෝරන්න (Select Report Type)</span>
            </h2>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">6 Official Formats Available</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportCategories.map((cat) => {
              const isSelected = activeReportType === cat.id;
              return (
                <div
                  key={cat.id}
                  onClick={() => setActiveReportType(cat.id)}
                  className={`p-5 rounded-3xl cursor-pointer transition-all duration-200 border text-left flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-600/30 shadow-lg shadow-blue-900/5'
                      : 'bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-3xl p-2.5 rounded-2xl bg-white border border-slate-100 shadow-sm">{cat.icon}</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                        cat.badgeColor || (isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-700 border-slate-200')
                      }`}>
                        {cat.badge}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">{cat.titleSi}</h3>
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mt-0.5">{cat.titleEn}</p>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2 leading-relaxed">{cat.desc}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSelected ? 'text-blue-700' : 'text-slate-400'}`}>
                      {isSelected ? '✓ දැනට තෝරාගෙන ඇත' : 'වාර්තාව පෙන්වන්න →'}
                    </span>
                    <span className="text-xs font-bold text-slate-400">Official PDF</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filter Controls Toolbar (Only for entity collections) */}
        {activeReportType !== 'national' && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <span>🔍 වාර්තා පෙරහන් සහ සෙවුම් (Filters & Query)</span>
              </h3>
              {(selectedDistrict !== 'All' || selectedMohArea !== 'All' || selectedRisk !== 'All' || searchTerm !== '') && (
                <button
                  onClick={() => {
                    setSelectedDistrict('All');
                    setSelectedMohArea('All');
                    setSelectedRisk('All');
                    setSearchTerm('');
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider"
                >
                  පෙරහන් ඉවත් කරන්න (Reset Filters)
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Search Box */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  සෙවීම (Search Keyword)
                </label>
                <input
                  type="text"
                  placeholder="නම, NIC, දුරකථන හෝ ප්‍රදේශය..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                />
              </div>

              {/* District Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  දිස්ත්‍රික්කය (District)
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value);
                    setSelectedMohArea('All');
                  }}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                >
                  <option value="All">සියලුම දිස්ත්‍රික්ක (All Districts)</option>
                  {DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* MOH Area Filter */}
              {(activeReportType === 'moh' || activeReportType === 'midwives' || activeReportType === 'mothers' || activeReportType === 'high_risk') && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    MOH ප්‍රදේශය (MOH Area)
                  </label>
                  <select
                    value={selectedMohArea}
                    onChange={(e) => setSelectedMohArea(e.target.value)}
                    disabled={selectedDistrict === 'All'}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all disabled:opacity-50"
                  >
                    <option value="All">සියලුම MOH කලාප (All MOH)</option>
                    {availableMohAreas.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Risk Level Filter (For Mothers) */}
              {(activeReportType === 'mothers') && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    අවදානම් මට්ටම (Risk Status)
                  </label>
                  <select
                    value={selectedRisk}
                    onChange={(e) => setSelectedRisk(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                  >
                    <option value="All">සියලුම කාණ්ඩ (All Risk Levels)</option>
                    <option value="Normal">Normal (සාමාන්‍ය)</option>
                    <option value="High Risk">High Risk (අධි අවදානම්)</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live Document Preview Section */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Header of Table View */}
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">📑</span>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  {activeReportType === 'national' && 'ජාතික විධායක සංඛ්‍යාලේඛන පෙරදසුන (National Summary)'}
                  {activeReportType === 'moh' && 'MOH පරිපාලන නිලධාරීන්ගේ ලේඛනය (MOH Officers Preview)'}
                  {activeReportType === 'hospital' && 'ජාතික රෝහල් ජාලය සහ පහසුකම් පෙරදසුන (Hospital Network Preview)'}
                  {activeReportType === 'midwives' && 'පවුල් සෞඛ්‍ය නිලධාරී නාමාවලිය (Midwives Preview)'}
                  {activeReportType === 'mothers' && 'මව්වරුන්ගේ නාමාවලිය පෙරදසුන (Maternal Registry Preview)'}
                  {activeReportType === 'high_risk' && 'අධි අවදානම් මව්වරුන්ගේ හදිසි ලේඛනය (High-Risk Critical Preview)'}
                </h3>
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
                වාර්තාව නිල වශයෙන් බාගත කිරීමට පෙර පහත දත්ත පරීක්ෂා කර තහවුරු කරගන්න.
              </p>
            </div>

            {/* Counter Badge */}
            <div className="flex items-center gap-2 bg-blue-50 text-blue-800 px-4 py-2 rounded-2xl border border-blue-100 self-start sm:self-auto font-black text-sm">
              <span>වාර්තාගත අයිතම:</span>
              <span className="text-blue-950 font-black text-base">
                {activeReportType === 'national' && `${mothers.length} Mothers`}
                {activeReportType === 'moh' && `${filteredMOH.length} Offices`}
                {activeReportType === 'hospital' && `${filteredHospitals.length} Hospitals`}
                {activeReportType === 'midwives' && `${filteredMidwives.length} Midwives`}
                {activeReportType === 'mothers' && `${filteredMothers.length} Records`}
                {activeReportType === 'high_risk' && `${filteredMothers.length} Critical Cases`}
              </span>
            </div>
          </div>

          {/* Table Content Render based on Report Type */}
          {loading ? (
            <div className="p-16 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
              <p className="text-slate-600 font-bold text-sm mt-3">වාර්තා දත්ත පූරණය වෙමින් පවතී...</p>
            </div>
          ) : activeReportType === 'national' ? (
            /* National Summary Preview */
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                  <p className="text-xs font-bold text-blue-600 uppercase">MOH Areas</p>
                  <p className="text-2xl sm:text-3xl font-black text-blue-900 mt-1">{mohAdmins.length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-center">
                  <p className="text-xs font-bold text-indigo-600 uppercase">Hospitals</p>
                  <p className="text-2xl sm:text-3xl font-black text-indigo-900 mt-1">{hospitals.length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 text-center">
                  <p className="text-xs font-bold text-sky-600 uppercase">Midwives (PHM)</p>
                  <p className="text-2xl sm:text-3xl font-black text-sky-900 mt-1">{midwives.length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                  <p className="text-xs font-bold text-emerald-600 uppercase">Total Mothers</p>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-900 mt-1">{mothers.length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-center col-span-2 sm:col-span-1">
                  <p className="text-xs font-bold text-red-600 uppercase">High Risk</p>
                  <p className="text-2xl sm:text-3xl font-black text-red-700 mt-1">{highRiskTotal}</p>
                </div>
              </div>

              {/* District Distribution Breakdown Table */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
                  දිස්ත්‍රික්ක අනුව මව්වරුන්ගේ ව්‍යාප්තිය (District-wise Breakdown)
                </h4>
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 text-xs uppercase font-extrabold">
                      <tr>
                        <th className="p-3">දිස්ත්‍රික්කය (District)</th>
                        <th className="p-3 text-center">ලියාපදිංචි මව්වරුන් ගණන</th>
                        <th className="p-3 text-right">ජාතික ප්‍රතිශතය (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm font-medium">
                      {Object.keys(districtCounts).length === 0 ? (
                        <tr>
                          <td colSpan="3" className="p-6 text-center text-slate-400">කිසිදු දත්තයක් නොමැත</td>
                        </tr>
                      ) : (
                        Object.entries(districtCounts).map(([dist, count]) => {
                          const pct = mothers.length > 0 ? ((count / mothers.length) * 100).toFixed(1) : 0;
                          return (
                            <tr key={dist} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-bold text-slate-800">{dist}</td>
                              <td className="p-3 text-center font-extrabold text-blue-700">{count}</td>
                              <td className="p-3 text-right text-slate-600 font-bold">{pct}%</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeReportType === 'moh' ? (
            /* MOH Preview Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead className="bg-slate-100 text-slate-700 text-xs uppercase font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">MOH නිලධාරී නම</th>
                    <th className="p-3.5">NIC / SLMC</th>
                    <th className="p-3.5">MOH ප්‍රදේශය</th>
                    <th className="p-3.5">දිස්ත්‍රික්කය</th>
                    <th className="p-3.5">විද්‍යුත් ලිපිනය</th>
                    <th className="p-3.5">දුරකථන අංක</th>
                    <th className="p-3.5 text-center">තත්ත්වය</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {filteredMOH.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-400 font-bold">කිසිදු MOH නිලධාරියෙකු සොයාගත නොහැකි විය</td>
                    </tr>
                  ) : (
                    filteredMOH.map((adm) => (
                      <tr key={adm.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">{adm.fullName}</td>
                        <td className="p-3.5 text-slate-600">
                          <div>{adm.nic}</div>
                          <div className="text-xs text-blue-600 font-bold">SLMC: {adm.slmcNumber}</div>
                        </td>
                        <td className="p-3.5 font-bold text-blue-900">{adm.mohArea}</td>
                        <td className="p-3.5 text-slate-700">{adm.district}</td>
                        <td className="p-3.5 text-slate-600 font-mono text-xs">{adm.email}</td>
                        <td className="p-3.5 text-slate-600">{adm.phone || adm.officePhone}</td>
                        <td className="p-3.5 text-center">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {adm.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : activeReportType === 'hospital' ? (
            /* Hospital Preview Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-slate-100 text-slate-700 text-xs uppercase font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">රෝහලේ නම</th>
                    <th className="p-3.5">ප්‍රවර්ගය</th>
                    <th className="p-3.5">දිස්ත්‍රික්කය / නගරය</th>
                    <th className="p-3.5">වෛද්‍ය අධිකාරී (MS)</th>
                    <th className="p-3.5">දුරකථන / Email</th>
                    <th className="p-3.5 text-center">ඇඳන් ධාරිතාව</th>
                    <th className="p-3.5">හදිසි පහසුකම්</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {filteredHospitals.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-400 font-bold">කිසිදු රෝහලක් සොයාගත නොහැකි විය</td>
                    </tr>
                  ) : (
                    filteredHospitals.map((hsp) => (
                      <tr key={hsp.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">{hsp.hospitalName}</td>
                        <td className="p-3.5 text-xs text-slate-600 font-medium">{hsp.hospitalType}</td>
                        <td className="p-3.5 text-slate-700 font-bold">{hsp.district} ({hsp.city})</td>
                        <td className="p-3.5 font-medium text-slate-800">{hsp.adminName}</td>
                        <td className="p-3.5 text-xs text-slate-600">
                          <div>{hsp.hospitalPhone}</div>
                          <div className="font-mono text-slate-500">{hsp.email}</div>
                        </td>
                        <td className="p-3.5 text-center font-extrabold text-blue-700">{hsp.maternityWardCapacity} Beds</td>
                        <td className="p-3.5 text-xs">
                          <div className="flex gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded font-bold ${hsp.hasLabourRoom === 'Yes' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>LR</span>
                            <span className={`px-1.5 py-0.5 rounded font-bold ${hsp.hasNicu === 'Yes' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-400'}`}>NICU</span>
                            <span className={`px-1.5 py-0.5 rounded font-bold ${hsp.hasBloodBank === 'Yes' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-400'}`}>Blood</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : activeReportType === 'midwives' ? (
            /* Midwives Preview Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead className="bg-slate-100 text-slate-700 text-xs uppercase font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">පවුල් සෞඛ්‍ය නිලධාරිනිය</th>
                    <th className="p-3.5">NIC / සේවක අංකය</th>
                    <th className="p-3.5">MOH ප්‍රදේශය</th>
                    <th className="p-3.5">සේවා කොට්ඨාසය / GN</th>
                    <th className="p-3.5">සම්බන්ධතා අංකය</th>
                    <th className="p-3.5 text-center">රාජකාරි තත්ත්වය</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {filteredMidwives.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-400 font-bold">කිසිදු පවුල් සෞඛ්‍ය නිලධාරිනියක් සොයාගත නොහැකි විය</td>
                    </tr>
                  ) : (
                    filteredMidwives.map((mid) => (
                      <tr key={mid.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">{mid.fullName}</td>
                        <td className="p-3.5 text-slate-600">
                          <div>{mid.nic}</div>
                          <div className="text-xs text-blue-600 font-bold">ID: {mid.employeeId}</div>
                        </td>
                        <td className="p-3.5 font-bold text-blue-900">{mid.mohArea} ({mid.district})</td>
                        <td className="p-3.5 text-slate-700">{mid.serviceArea || mid.gnDivisions}</td>
                        <td className="p-3.5 text-slate-600">{mid.phone}</td>
                        <td className="p-3.5 text-center">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {mid.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Mothers / High Risk Preview Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead className="bg-slate-100 text-slate-700 text-xs uppercase font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">මවගේ නම</th>
                    <th className="p-3.5">NIC / වයස</th>
                    <th className="p-3.5">රුධිර ගණය</th>
                    <th className="p-3.5">ගර්භ සති / EDD</th>
                    <th className="p-3.5">MOH ප්‍රදේශය</th>
                    <th className="p-3.5">පවුල් සෞඛ්‍ය නිලධාරිනිය</th>
                    <th className="p-3.5">හදිසි දුරකථන</th>
                    <th className="p-3.5 text-center">අවදානම් තත්ත්වය</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {filteredMothers.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-400 font-bold">කිසිදු මවකගේ වාර්තාවක් සොයාගත නොහැකි විය</td>
                    </tr>
                  ) : (
                    filteredMothers.map((m) => {
                      const isHigh = (m.riskStatus || '').toLowerCase() === 'high risk' || (m.riskStatus || '').toLowerCase() === 'high';
                      return (
                        <tr key={m.id} className={`hover:bg-blue-50/50 transition-colors ${isHigh ? 'bg-red-50/20' : ''}`}>
                          <td className="p-3.5 font-bold text-slate-900">{m.fullName}</td>
                          <td className="p-3.5 text-slate-600">
                            <div>{m.nic}</div>
                            <div className="text-xs text-slate-400">{m.age ? `${m.age} වසර` : '—'}</div>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded font-black text-xs bg-red-100 text-red-700">
                              {m.bloodGroup}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-blue-900">{m.gestationalAge} සති</div>
                            <div className="text-xs text-slate-500">EDD: {m.edd}</div>
                          </td>
                          <td className="p-3.5 text-slate-700 font-medium">{m.mohArea} ({m.district})</td>
                          <td className="p-3.5 text-slate-700">{m.midwifeName}</td>
                          <td className="p-3.5 text-slate-600">{m.phone || m.emergencyPhone}</td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${
                              isHigh 
                                ? 'bg-red-100 text-red-800 border-red-200 animate-pulse' 
                                : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}>
                              {isHigh ? '⚠️ HIGH RISK' : 'NORMAL'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Printable Document Modal (Simulates Official Formatted Letterhead) */}
        {showPrintModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-blue-950/70 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-blue-100 my-8 overflow-hidden flex flex-col max-h-[92vh]">
              {/* Modal Top Control Bar */}
              <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">🖨️</span>
                  <span className="font-bold text-sm sm:text-base">Official Document Print Preview</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase shadow transition-all flex items-center gap-1.5"
                  >
                    <span>Print Document</span>
                  </button>
                  <button
                    onClick={() => setShowPrintModal(false)}
                    className="p-2 text-slate-400 hover:text-white rounded-lg font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Printable Body Content (Simulating Official Letterhead Paper) */}
              <div className="p-6 sm:p-10 overflow-y-auto space-y-6 text-slate-800 bg-white" id="printable-area">
                {/* Official Letterhead Header */}
                <div className="border-b-2 border-slate-900 pb-4 text-center">
                  <div className="text-xs font-bold text-blue-900 tracking-widest uppercase">
                    Democratic Socialist Republic of Sri Lanka • Ministry of Health
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 uppercase tracking-tight">
                    MAATHA NATIONAL MATERNAL & CHILD HEALTH PORTAL
                  </h2>
                  <p className="text-xs font-bold text-slate-500 uppercase mt-0.5">
                    Official Administrative Dossier & Intelligence Registry
                  </p>
                  <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600 mt-4 pt-2 border-t border-slate-200">
                    <span>DOC REF: REF-MTH-{Date.now().toString().slice(-6)}</span>
                    <span>ISSUED: {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString()}</span>
                    <span>CONFIDENTIAL / OFFICIAL</span>
                  </div>
                </div>

                {/* Report Specific Details */}
                <div>
                  <h3 className="text-base font-black text-blue-900 uppercase">
                    {activeReportType === 'national' && 'National Maternal Health Strategic Summary Report'}
                    {activeReportType === 'moh' && 'Medical Officers of Health (MOH) Administrative Directory'}
                    {activeReportType === 'hospital' && 'National Hospital Network & Clinical Facilities Directory'}
                    {activeReportType === 'midwives' && 'Public Health Midwives (PHM) Field Staff Registry'}
                    {activeReportType === 'mothers' && 'National Maternal Healthcare & Antenatal Registry'}
                    {activeReportType === 'high_risk' && 'High-Risk Critical Pregnancies Emergency Monitoring Report'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Filtered Criteria: District: {selectedDistrict} | MOH Area: {selectedMohArea} | Risk: {selectedRisk}
                  </p>
                </div>

                {/* Printable Table */}
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-slate-700">
                      <tr>
                        <th className="p-2 border-r border-slate-300">#</th>
                        <th className="p-2 border-r border-slate-300">Name / Title</th>
                        <th className="p-2 border-r border-slate-300">NIC / ID</th>
                        <th className="p-2 border-r border-slate-300">District / MOH</th>
                        <th className="p-2 border-r border-slate-300">Contact / Email</th>
                        <th className="p-2">Status / Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(activeReportType === 'moh' ? filteredMOH :
                        activeReportType === 'hospital' ? filteredHospitals :
                        activeReportType === 'midwives' ? filteredMidwives :
                        filteredMothers
                      ).slice(0, 50).map((row, idx) => (
                        <tr key={row.id || idx}>
                          <td className="p-2 border-r border-slate-200 text-center font-bold">{idx + 1}</td>
                          <td className="p-2 border-r border-slate-200 font-bold">{row.fullName || row.hospitalName}</td>
                          <td className="p-2 border-r border-slate-200">{row.nic || row.hospitalCode || '—'}</td>
                          <td className="p-2 border-r border-slate-200">{row.district} {row.mohArea ? `(${row.mohArea})` : ''}</td>
                          <td className="p-2 border-r border-slate-200">{row.phone || row.hospitalPhone || row.email}</td>
                          <td className="p-2 font-bold">{row.riskStatus || row.status || 'Active'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Official Signatures and Seal Space */}
                <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs font-bold text-slate-600">
                  <div>
                    <div className="border-t border-slate-400 pt-2 w-48 mx-auto">
                      Super Administrator
                      <div className="text-[10px] text-slate-400 font-normal">Maatha Health Portal, Sri Lanka</div>
                    </div>
                  </div>
                  <div>
                    <div className="border-t border-slate-400 pt-2 w-48 mx-auto">
                      Director / Medical Superintendent
                      <div className="text-[10px] text-slate-400 font-normal">Ministry of Health Verification</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default ReportsAndDocuments;
