'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card';
import { BadgeCheck, Globe, MapPin, Search, Sliders, Target, Eye, MessageSquare, User, Check } from 'lucide-react';
import { campaignsApi } from '../../../lib/campaignsApi';
import CommentThread from './CommentThread';

export default function GoogleAdPreviewPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'ad' | 'targeting' | 'campaign' | 'comments'>('ad');
  const [error, setError] = useState('');
  const [draftId, setDraftId] = useState<string | null>(null);

  const [comments, setComments] = useState<any[]>([]);
  const [reviewerName, setReviewerName] = useState('');
  const [tempName, setTempName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [activeCommentField, setActiveCommentField] = useState<{ type: 'headline' | 'description'; index: number } | null>(null);

  // Lockscreen Passcode Protection State
  const [passcode, setPasscode] = useState('');
  const [passcodeEntered, setPasscodeEntered] = useState('');
  const [showLockScreen, setShowLockScreen] = useState(false);
  const [passcodeError, setPasscodeError] = useState('');

  useEffect(() => {
    const savedName = localStorage.getItem('reviewerName');
    if (savedName) {
      setReviewerName(savedName);
    } else {
      setShowNamePrompt(true);
    }
  }, []);

  useEffect(() => {
    const id = searchParams.get('data');
    if (id) {
      setDraftId(id);
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchDraft() {
      try {
        const id = searchParams.get('data');
        if (!id) {
          throw new Error('No preview data found in URL');
        }

        if (id.length > 30 || id.includes('-')) {
          const draft = await campaignsApi.getPublicDraft(id);
          const activeAdset = draft.adsets?.[0] || {};
          const activeAd = activeAdset.ads?.[0] || {};

          // If the draft contains a passcode configuration in payload, trigger the lockscreen
          const draftPasscode = draft.campaign_payload?.client_review_password || '';
          if (draftPasscode) {
            setPasscode(draftPasscode);
            // Check session storage to see if passcode has already been validated in this tab session
            const validated = sessionStorage.getItem(`passcode_valid_${id}`);
            if (validated !== 'true') {
              setShowLockScreen(true);
            }
          }

          setData({
            campaign: {
              name: draft.name,
              client_name: draft.client_name,
              objective: draft.campaign_payload?.objective || 'SALES',
              budget: draft.campaign_payload?.daily_budget || 0,
            },
            targeting: activeAdset.payload?.targeting || { geo_locations: {}, keywords: [] },
            ad: activeAd.payload || {}
          });
        } else {
          const decoded = decodeURIComponent(escape(atob(id)));
          setData(JSON.parse(decoded));
        }
      } catch (err: any) {
        setError('Invalid or corrupted preview data.');
        console.error(err);
      }
    }

    fetchDraft();
  }, [searchParams]);

  useEffect(() => {
    if (!draftId || draftId.length <= 30 && !draftId.includes('-')) return;

    async function fetchComments() {
      try {
        const res = await campaignsApi.getPublicComments(draftId!);
        setComments(res);
      } catch (err) {
        console.error('Failed to load comments', err);
      }
    }

    fetchComments();
    const interval = setInterval(fetchComments, 15000);
    return () => clearInterval(interval);
  }, [draftId]);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName.trim()) return;
    localStorage.setItem('reviewerName', tempName.trim());
    setReviewerName(tempName.trim());
    setShowNamePrompt(false);
  };

  const handleAddComment = async (fieldType: 'headline' | 'description', fieldIndex: number, message: string) => {
    if (!draftId || !reviewerName) return;
    try {
      const res = await campaignsApi.addPublicComment(draftId, {
        field_type: fieldType,
        field_index: fieldIndex,
        author_name: reviewerName,
        message,
      });
      setComments((prev) => [...prev, res]);
    } catch (err) {
      console.error('Failed to submit comment', err);
    }
  };

  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeEntered === passcode) {
      const id = searchParams.get('data') || '';
      sessionStorage.setItem(`passcode_valid_${id}`, 'true');
      setShowLockScreen(false);
      setPasscodeError('');
    } else {
      setPasscodeError('Invalid campaign passcode.');
    }
  };

  if (showLockScreen) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Campaign Lockscreen</h1>
            <p className="text-xs text-zinc-500">This preview requires a passcode configured in the campaign builder settings.</p>
          </div>
          <form onSubmit={handleVerifyPasscode} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Passcode</label>
              <input
                type="password"
                required
                value={passcodeEntered}
                onChange={(e) => setPasscodeEntered(e.target.value)}
                placeholder="Enter campaign passcode"
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-transparent text-center font-mono tracking-widest"
              />
              {passcodeError && (
                <p className="text-[10px] text-red-500 font-medium">{passcodeError}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded font-medium text-xs hover:opacity-90 transition-opacity"
            >
              Unlock Preview
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-red-500 font-medium">{error}</div>;
  }

  if (!data) {
    return <div className="p-8 text-center text-zinc-500">Loading preview...</div>;
  }

  const rawAd = data.ad || data;
  const headlines = (rawAd.headlines || []).filter((h: string) => h.trim() !== '');
  const descriptions = (rawAd.descriptions || []).filter((d: string) => d.trim() !== '');
  const finalUrl = (rawAd.final_urls && rawAd.final_urls[0]) ? rawAd.final_urls[0] : 'https://example.com';
  const displayUrl = finalUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];

  const previewHeadlines = headlines.slice(0, 3).join(' | ');
  const previewDesc = descriptions.slice(0, 2).join(' ');

  const geoLocations = data.targeting?.geo_locations || {};
  const keywords = data.targeting?.keywords || [];

  const getCommentCount = (type: 'headline' | 'description', idx: number) => {
    return comments.filter((c) => c.field_type === type && c.field_index === idx).length;
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
          <Link href="/" className="block hover:opacity-80 transition-opacity flex-shrink-0">
            <img 
              src="https://res.cloudinary.com/lamanify/image/upload/v1780368033/Lamanify_44_tvqgij.webp" 
              alt="LamaniAds" 
              className="h-8 w-auto object-contain flex-shrink-0"
              style={{ minWidth: '100px' }}
            />
          </Link>
          <span className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">Google Campaign Preview</h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">Review draft configuration</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          {/* Mobile Menu segmented control inside header */}
          <div className="md:hidden flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-md border border-zinc-200 dark:border-zinc-800 overflow-x-auto max-w-full">
            <button 
              onClick={() => setActiveTab('ad')}
              className={`px-3 py-1 text-xs font-semibold rounded transition-all whitespace-nowrap ${activeTab === 'ad' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Preview
            </button>
            <button 
              onClick={() => setActiveTab('targeting')}
              className={`px-3 py-1 text-xs font-semibold rounded transition-all whitespace-nowrap ${activeTab === 'targeting' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Targeting
            </button>
            <button 
              onClick={() => setActiveTab('campaign')}
              className={`px-3 py-1 text-xs font-semibold rounded transition-all whitespace-nowrap ${activeTab === 'campaign' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Campaign
            </button>
            {draftId && (
              <button 
                onClick={() => setActiveTab('comments')}
                className={`px-3 py-1 text-xs font-semibold rounded transition-all whitespace-nowrap ${activeTab === 'comments' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                Comments
              </button>
            )}
          </div>
        </div>
      </header>

      {showNamePrompt && (
        <div className="bg-brand/5 border-b border-brand/10 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 max-w-7xl w-full mx-auto mt-4 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 rounded-full text-brand">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Welcome to Campaign Review</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Please provide your name so the agency knows who is commenting.</p>
            </div>
          </div>
          <form onSubmit={handleSaveName} className="flex gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="Your name..."
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              className="flex-1 md:w-60 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand/40 dark:focus:ring-brand/30"
              required
            />
            <button
              type="submit"
              className="bg-brand text-white text-sm px-4 py-2 rounded-md hover:opacity-90 transition-opacity font-semibold flex items-center gap-1.5"
            >
              <Check className="h-4 w-4" />
              Save
            </button>
          </form>
        </div>
      )}

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Left Sidebar Menu */}
        <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 p-6 space-y-2 hidden md:block">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block px-3 mb-2">Preview Sections</span>
          
          <button
            onClick={() => setActiveTab('ad')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'ad' ? 'bg-brand text-white font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}
          >
            <Eye className="h-4 w-4" />
            <span>Ads Preview</span>
          </button>

          <button
            onClick={() => setActiveTab('targeting')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'targeting' ? 'bg-brand text-white font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}
          >
            <Target className="h-4 w-4" />
            <span>Targeting</span>
          </button>

          <button
            onClick={() => setActiveTab('campaign')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'campaign' ? 'bg-brand text-white font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}
          >
            <Sliders className="h-4 w-4" />
            <span>Campaign</span>
          </button>

          {draftId && (
            <button
              onClick={() => setActiveTab('comments')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'comments' ? 'bg-brand text-white font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Comments</span>
            </button>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Read Only Data view based on selected tab */}
          <div className="space-y-6">
            {activeTab === 'ad' && (
              <>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                        <BadgeCheck className="h-4 w-4 text-brand" /> 
                        Headlines <span className="text-zinc-400 font-normal text-sm font-mono tabular-nums">({headlines.length}/15)</span>
                      </h3>
                    </div>
                    <ul className="space-y-2">
                      {headlines.map((hl: string, i: number) => {
                        const cnt = getCommentCount('headline', i);
                        const isActive = activeCommentField?.type === 'headline' && activeCommentField?.index === i;
                        return (
                          <li 
                            key={i} 
                            className={`relative flex items-center justify-between text-sm bg-zinc-50 dark:bg-zinc-900/50 px-3 py-2 rounded-md border transition-all ${
                              cnt > 0 ? 'border-brand/30 dark:border-brand/20 pl-4 border-l-2 border-l-brand' : 'border-zinc-200 dark:border-zinc-800'
                            }`}
                          >
                            <span className="text-zinc-800 dark:text-zinc-200 pr-12">{hl}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] text-zinc-400 font-mono tracking-wide tabular-nums">{hl.length}/30</span>
                              {draftId && (
                                <button
                                  onClick={() => {
                                    if (showNamePrompt) {
                                      setShowNamePrompt(true);
                                      return;
                                    }
                                    setActiveCommentField(isActive ? null : { type: 'headline', index: i });
                                  }}
                                  className={`p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1 ${
                                    cnt > 0 ? 'text-brand' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                                  }`}
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                  {cnt > 0 && <span className="text-[10px] font-bold font-mono">{cnt}</span>}
                                </button>
                              )}
                            </div>

                            {isActive && (
                              <CommentThread
                                draftId={draftId!}
                                fieldType="headline"
                                fieldIndex={i}
                                fieldContent={hl}
                                authorName={reviewerName}
                                comments={comments.filter((c) => c.field_type === 'headline' && c.field_index === i)}
                                onClose={() => setActiveCommentField(null)}
                                onSubmitComment={(msg) => handleAddComment('headline', i, msg)}
                              />
                            )}
                          </li>
                        );
                      })}
                      {headlines.length === 0 && <li className="text-sm text-zinc-500 italic px-2">No headlines provided.</li>}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-brand" /> 
                        Descriptions <span className="text-zinc-400 font-normal text-sm font-mono tabular-nums">({descriptions.length}/4)</span>
                      </h3>
                    </div>
                    <ul className="space-y-2">
                      {descriptions.map((desc: string, i: number) => {
                        const cnt = getCommentCount('description', i);
                        const isActive = activeCommentField?.type === 'description' && activeCommentField?.index === i;
                        return (
                          <li 
                            key={i} 
                            className={`relative flex flex-col gap-1.5 text-sm bg-zinc-50 dark:bg-zinc-900/50 px-3 py-2.5 rounded-md border transition-all ${
                              cnt > 0 ? 'border-brand/30 dark:border-brand/20 pl-4 border-l-2 border-l-brand' : 'border-zinc-200 dark:border-zinc-800'
                            }`}
                          >
                            <span className="text-zinc-800 dark:text-zinc-200 leading-relaxed pr-12">{desc}</span>
                            <div className="flex items-center justify-between mt-1">
                              {draftId && (
                                <button
                                  onClick={() => {
                                    if (showNamePrompt) {
                                      setShowNamePrompt(true);
                                      return;
                                    }
                                    setActiveCommentField(isActive ? null : { type: 'description', index: i });
                                  }}
                                  className={`p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 ${
                                    cnt > 0 ? 'text-brand' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                                  }`}
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                  <span className="text-xs font-medium">Comments</span>
                                  {cnt > 0 && <span className="text-[10px] font-bold font-mono bg-brand/10 text-brand px-1.5 py-0.5 rounded-full">{cnt}</span>}
                                </button>
                              )}
                              <span className="text-[11px] text-zinc-400 font-mono tracking-wide tabular-nums ml-auto">{desc.length}/90</span>
                            </div>

                            {isActive && (
                              <CommentThread
                                draftId={draftId!}
                                fieldType="description"
                                fieldIndex={i}
                                fieldContent={desc}
                                authorName={reviewerName}
                                comments={comments.filter((c) => c.field_type === 'description' && c.field_index === i)}
                                onClose={() => setActiveCommentField(null)}
                                onSubmitComment={(msg) => handleAddComment('description', i, msg)}
                              />
                            )}
                          </li>
                        );
                      })}
                      {descriptions.length === 0 && <li className="text-sm text-zinc-500 italic px-2">No descriptions provided.</li>}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-brand" /> Final URL
                    </h3>
                    <div className="text-sm font-medium text-brand break-all bg-brand/5 dark:bg-brand/10 p-3 rounded-md border border-brand/10 dark:border-brand/20">
                      {finalUrl}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === 'targeting' && (
              <Card>
                <CardHeader>
                  <CardTitle>Targeting Configuration</CardTitle>
                  <CardDescription>Demographic parameters and audiences targeted by this ad group.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Locations List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Selected Locations</h4>
                    {geoLocations.custom_selected === true ? (
                      <div className="flex flex-wrap gap-2">
                        {[
                          ...(geoLocations.countries || []).map((c: string) => ({ name: c, type: 'country' })),
                          ...(geoLocations.regions || []).map((r: string) => ({ name: r, type: 'region' })),
                          ...(geoLocations.cities || []).map((c: string) => ({ name: c, type: 'city' }))
                        ].map((loc, idx) => (
                          <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200">
                            {loc.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 inline-block">
                        {geoLocations.countries?.[0] === 'MY' ? 'Malaysia' : 'All countries and territories'}
                      </span>
                    )}
                  </div>

                  {/* Keywords List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {keywords.map((k: any, idx: number) => {
                        const kwText = typeof k === 'string' ? k : k.text;
                        return (
                          <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                            <span>{kwText}</span>
                          </span>
                        );
                      })}
                      {keywords.length === 0 && <span className="text-sm text-zinc-500 italic">No targeting keywords specified.</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'campaign' && (
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Settings</CardTitle>
                  <CardDescription>Global budget and delivery goals set for this campaign.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-md border border-zinc-200 dark:border-zinc-800">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Campaign Objective</span>
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{data.campaign?.objective || 'SALES'}</span>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-md border border-zinc-200 dark:border-zinc-800">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Daily Budget</span>
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 font-mono tabular-nums">
                        RM {data.campaign?.budget ? Number(data.campaign.budget).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-md border border-zinc-200 dark:border-zinc-800">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Campaign Name</span>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{data.campaign?.name || 'Untitled Campaign'}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'comments' && (
              <Card>
                <CardHeader>
                  <CardTitle>Review Comments</CardTitle>
                  <CardDescription>All contextual client feedback left on individual headlines or descriptions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {comments.map((comment) => {
                    const isHeadline = comment.field_type === 'headline';
                    const targetContent = isHeadline 
                      ? headlines[comment.field_index] 
                      : descriptions[comment.field_index];
                    return (
                      <div 
                        key={comment.id} 
                        className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-2 cursor-pointer hover:border-brand/40 transition-colors"
                        onClick={() => {
                          setActiveTab('ad');
                          setTimeout(() => {
                            setActiveCommentField({ type: comment.field_type, index: comment.field_index });
                          }, 100);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-brand uppercase tracking-widest">
                            {comment.field_type} {comment.field_index + 1}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500 italic truncate max-w-full">
                          "{targetContent}"
                        </div>
                        <div className="border-t border-zinc-150 dark:border-zinc-800 pt-2">
                          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                            {comment.author_name}:
                          </span>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                            {comment.message}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {comments.length === 0 && (
                    <div className="text-center py-12 text-zinc-400 dark:text-zinc-600 flex flex-col items-center justify-center gap-2">
                      <MessageSquare className="h-8 w-8 stroke-[1.5]" />
                      <span className="text-sm">No review comments yet.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Visual Google SERP Preview */}
          <div className={`sticky top-24 flex justify-center px-0 ${activeTab !== 'ad' ? 'hidden lg:flex' : 'flex'}`}>
            <div className="bg-white border shadow-sm w-[375px] rounded-[2rem] border-zinc-300 shadow-xl overflow-hidden transition-all duration-300">
              
              {/* Fake Mobile Header */}
              <div className="bg-zinc-100 px-4 py-2 border-b border-zinc-200 flex justify-center items-center">
                <div className="w-1/2 h-5 bg-white rounded-full flex items-center px-3 text-[10px] text-zinc-400 justify-center">
                  <Search className="h-3 w-3 mr-1" /> google.com
                </div>
              </div>

              {/* Google Search Body Content */}
              <div className="bg-white p-4 pb-12 min-h-[500px]">
                
                {/* Fake search bar input display */}
                <div className="flex items-center bg-white border border-zinc-200 rounded-full shadow-sm mb-6 px-4 py-2 text-sm">
                  <Search className="h-4 w-4 text-zinc-400 mr-2" />
                  <span className="text-zinc-800 flex-1">search query...</span>
                </div>

                {/* Sponsored Ad Container */}
                <div className="max-w-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12px] font-bold text-zinc-900 bg-zinc-100 px-1.5 rounded-sm">Sponsored</span>
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <div className="w-5 h-5 bg-zinc-200 rounded-full flex-shrink-0 flex items-center justify-center">
                        <Globe className="h-3 w-3 text-zinc-500" />
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="text-[12px] text-zinc-900 leading-none truncate font-medium">
                          {data.campaign?.client_name || data.client_name || 'Your Business'}
                        </span>
                        <span className="text-[11px] text-zinc-500 leading-none truncate">{displayUrl}</span>
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-[#1a0dab] hover:underline cursor-pointer text-lg font-medium leading-snug mb-1">
                    {previewHeadlines || 'Your Headline Will Appear Here | And Here | And Here'}
                  </h3>
                  
                  <p className="text-[#4d5156] text-[13px] leading-[1.4]">
                    {previewDesc || 'Your description will appear here. It will provide more details about your product, service, or offer to entice users to click on your ad.'}
                  </p>
                </div>

                <div className="border-b border-zinc-100 my-6"></div>
                
                {/* Fake Organic Result */}
                <div className="max-w-xl opacity-50 pointer-events-none">
                   <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-5 h-5 bg-zinc-200 rounded-full flex-shrink-0"></div>
                      <div className="flex flex-col truncate">
                        <span className="text-[12px] text-zinc-900 leading-none truncate font-medium">Organic Wikipedia Search</span>
                        <span className="text-[11px] text-zinc-500 leading-none truncate">https://en.wikipedia.org/wiki/Search</span>
                      </div>
                    </div>
                    <h3 className="text-[#1a0dab] text-lg font-medium leading-snug mb-1">
                      Web Search Engine - Wikipedia
                    </h3>
                    <p className="text-[#4d5156] text-[13px] leading-[1.4]">
                      A web search engine or Internet search engine is a software system that is designed to carry out web searches...
                    </p>
                </div>

              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
