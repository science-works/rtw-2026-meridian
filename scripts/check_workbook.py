import sys,re,pandas as pd
x=pd.ExcelFile(sys.argv[1]); print(x.sheet_names)
C=x.parse('Cases450'); B=x.parse('Blocks'); S=x.parse('Slides'); E=x.parse('Events'); T=x.parse('Timing Rules'); O=x.parse('Overview',header=None)
def t(s):
    m=re.search(r'Day (-?\d+)\D*?(\d\d):(\d\d)',str(s)); return None if not m else int(m[1])*1440+int(m[2])*60+int(m[3])
NOW=t('Day 1 11:30')
print("shapes",C.shape,B.shape,S.shape,E.shape)
print(O.fillna('').astype(str).apply(lambda r:' | '.join(v for v in r if v),axis=1).head(20).to_string())
print(T[T.iloc[:,0].astype(str).str.contains('now',case=False)].to_string())
ids=set(C['Case ID']); print("cases",len(ids),C['Cohort'].value_counts().to_dict())
E['t']=E['Simulated time'].map(t); print("unparsed",E['t'].isna().sum(), E.loc[E['t'].isna(),'Simulated time'].unique()[:5])
fut=E[E['t']>NOW]; print("events after 11:30:",len(fut)); print(fut[['Event ID','Simulated time','Case ID','Event type','Activation state']].head(15).to_string(index=False))
print("activation",E['Activation state'].value_counts().to_dict())
print("pending",E[E['Activation state']!='Recorded'][['Event ID','Simulated time','Case ID','Event type']].to_string(index=False))
r=set(E[E['Event type']=='CASE_RECEIVED']['Case ID']); print("no receipt",ids-r)
print("dup slides",S['Slide ID'].duplicated().sum(),"dup blocks",B.duplicated(['Case ID','Block ID']).sum(),"dup events",E['Event ID'].duplicated().sum())
bk=set(zip(B['Case ID'],B['Block ID'])); eb=E.dropna(subset=['Block ID']); print("bad block refs",sum((c,b) not in bk for c,b in zip(eb['Case ID'],eb['Block ID'])))
print("bad case refs",(~E['Case ID'].isin(ids)).sum(),(~B['Case ID'].isin(ids)).sum(),(~S['Case ID'].isin(ids)).sum(),"bad slide refs",(~E.dropna(subset=['Slide ID'])['Slide ID'].isin(set(S['Slide ID']))).sum())
nb=B.groupby('Case ID').size(); ns=S.groupby('Case ID').size(); m=C.set_index('Case ID')
print("blocks mismatch",sum(int(m.at[c,'Blocks expected'])!=int(nb.get(c,0)) for c in ids),"slides mismatch",sum(int(m.at[c,'Slides in case'])!=int(ns.get(c,0)) for c in ids))
C['te']=C['Stage entered (simulated)'].map(t); print("stage entered after now",(C['te']>NOW).sum(), C.loc[C['te']>NOW,['Case ID','Stage entered (simulated)']].head().to_string(index=False))
rec=E[E['Event type']=='CASE_RECEIVED'].groupby('Case ID')['t'].min(); bad=[c for c,g in E.groupby('Case ID') if c in rec and (g['t']<rec[c]).any()]; print("events before receipt",len(bad),bad[:5])
print(pd.crosstab(C['Stage snapshot'],C['Cohort'],margins=True).to_string())
# latest-event stage vs snapshot
E2=E[E['Activation state']=='Recorded'].sort_values(['t','Event ID']); last=E2.groupby('Case ID').tail(1).set_index('Case ID')['Stage']
mis=[(c,m.at[c,'Stage snapshot'],last.get(c)) for c in ids if str(last.get(c)).replace(' ','').lower()!=str(m.at[c,'Stage snapshot']).replace(' ','').lower()]
print("latest-event stage != snapshot:",len(mis),mis[:12])
pre=['Received/booked','Waiting for dissection/cut-up','Awaiting processor or processing','Decalcification','Embedding']
print("uncut cases with slides",S[S['Case ID'].isin(C[C['Stage snapshot'].isin(pre)]['Case ID'])]['Case ID'].nunique())
lv=S[S['Level'].astype(str).str.match(r'L\d')].groupby('Case ID')['Level'].nunique()
print("levels recorded vs slides mismatch",[(c,int(m.at[c,'Levels recorded']),int(lv.get(c,0))) for c in ids if int(m.at[c,'Levels recorded'])>0 and int(m.at[c,'Levels recorded'])!=int(lv.get(c,0))][:6])
bs=S[S['Stainer basket'].notna()]; print("baskets",bs['Stainer basket'].value_counts().to_dict(),bs['Case ID'].nunique())
E['hod']=(E['t']%1440)/60
staffed={'Embedding','Microtomy','H&E staining','IQC','Dissection/cut-up','Dissection / cut-up','Ready for pathologist handoff','Decalcification'}
d=E[E['Case ID'].isin(set(C[C['Demo case?']=='Yes']['Case ID']))]
print("demo unstaffed",len(d[d['Stage'].isin(staffed)&((d['hod']<7)|(d['hod']>=20))]))
for c in ['26H1004','26H1005','26H1018','26H1015','26H1003','26H2345']:
    print('---',c, m.loc[c,['Stage snapshot','Alert category','Handoff ETA status']].to_dict() if c in m.index else 'MISSING')
    print(E[E['Case ID']==c].sort_values('t')[['Simulated time','Block ID','Stage','Event type','Activation state']].to_string(index=False))
