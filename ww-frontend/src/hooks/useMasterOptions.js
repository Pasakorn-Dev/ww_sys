import { useState, useEffect } from 'react';
import apiFetch from '../services/apiFetch';

export default function useMasterOptions(branchId) {
  const [options, setOptions] = useState({
    transactionTypes: [],
    logWoodTypes: [],
    logWoodEvalSizes: [],
    truckCompanies: [],
    sawTimes: [],
    sawWoodTypes: []
  });
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  useEffect(() => {
    // ถ้ายังไม่ได้เลือกสาขา ให้ล้างค่า Dropdown
    if (!branchId) {
      setOptions({
        transactionTypes: [], logWoodTypes: [], logWoodEvalSizes: [],
        truckCompanies: [], sawTimes: [], sawWoodTypes: []
      });
      return;
    }

    const fetchOptions = async () => {
      setIsLoadingOptions(true);
      try {
        const res = await apiFetch(`/master-options?branch_id=${branchId}`);
        if (res?.success) {
          setOptions(res.data);
        }
      } catch (error) {
        console.error('Error fetching master options:', error);
      } finally {
        setIsLoadingOptions(false);
      }
    };

    fetchOptions();
  }, [branchId]); // 💡 จะดึงข้อมูลใหม่ทันทีที่ branchId เปลี่ยน

  return { options, isLoadingOptions };
}