import sys,re,pandas as pd
E=pd.read_excel(sys.argv[1],'Events')
def t(s):
    m=re.search(r'Day (-?\d+)\D*?(\d\d):(\d\d)',str(s)); return int(m[1])*1440+int(m[2])*60+int(m[3])
E['t']=E['Simulated time'].map(t)
pairs=[('EMBEDDING_COMPLETE','LEVELS_CUT'),('LEVELS_CUT','BASKET_LOADED'),('STAINING_COMPLETE','SCAN_COMPLETE'),('SCAN_COMPLETE','IQC_PASSED'),('STAINING_COMPLETE','IQC_PASSED'),('MICROTOMY_STARTED','LEVELS_CUT'),('PROCESSOR_COMPLETE','EMBEDDING_STARTED')]
for a,b in pairs:
    bad=[]
    for c,g in E.groupby('Case ID'):
        ta=g[g['Event type']==a]['t']; tb=g[g['Event type']==b]['t']
        if len(ta) and len(tb) and tb.min()<ta.max(): bad.append(c)
    print(f"{b} before {a}: {len(bad)} {bad[:8]}")
