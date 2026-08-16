import React, { useState, useEffect } from 'react';
import { InlineLoader } from '../../components/Loader/Loader';
import InsightsList from '../../components/AI/InsightsList';
import aiApi from '../../services/aiApi';
import { useToast } from '../../context/ToastContext';

const AIInsights = () => {
  const { toast } = useToast();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await aiApi.dashboardInsights();
      setInsights(data.insights || []);
    } catch (error) {
      toast.error('Failed to load AI insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>AI Insights</h1>
          <p>Automatically generated observations from real student data.</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={load}>↺ Refresh</button>
      </div>

      {loading ? <InlineLoader /> : <InsightsList insights={insights} />}
    </div>
  );
};

export default AIInsights;
