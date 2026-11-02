/* =====================================================================
   BMC Partnership Agreement – settings
   ===================================================================== */
window.BMC_CONFIG = {

  /* Paste the Google Apps Script "Web app URL" between the quotes.
     It looks like: https://script.google.com/macros/s/AKfy.../exec        */
  sendUrl: "https://script.google.com/macros/s/AKfycbx-k_3Uko0UGQwEk2XRl5VARw0a37ibB96yWjo7HvtA8MuQ3RBSElsqIqQiZZmcMIRv/exec",

  /* Reactive rate card shown on the Invoicing step.
     Edit the figures here when rates change – nothing else needs touching. */
  rates: {
    title: "Premier Reactive Non-Tiered inc. 1st Hr Rates",
    effective: "01/10/2026",
    columns: ["Mon – Fri, 8am – 5pm", "5pm – 8am, weekends & public holidays"],
    groups: [
      { name: "General Trades", rows: [
        ["Arrival fee – inclusive of call-out, travel & 1st hour on site", "£110.00", "£170.00"],
        ["Hourly rate",                                                  "£46.00",  "£65.00"],
        ["Day rate – 8 hrs labour only",                                 "£375.00", "N/A"]
      ]},
      { name: "Electricians", rows: [
        ["Arrival fee – inclusive of call-out, travel & 1st hour on site", "£125.00", "£185.00"],
        ["Hourly rate",                                                  "£55.00",  "£75.00"],
        ["Day rate – 8 hrs labour only",                                 "£425.00", "N/A"]
      ]}
    ],
    uplifts: ["Materials uplift 15%", "Plant uplift 15%", "Sub-contractor uplift 20%"],
    terms: [
      "The rates above apply to all our directly employed operatives regardless of trade. They do not include drain jetting, roller shutters or fire alarm engineers; these services are provided by BMC using specialist sub-contractors.",
      "The arrival fee is subject to the locations of your sites. We reserve the right to discuss additional travel charges at the appropriate hourly rate should any locations require it. If we win the work for all of your sites in our direct labour footprint (in red on the map), we will not charge any additional travel for the arrival fee.",
      "There is one arrival fee per job regardless of the number of visits, but we would charge this fee for each operative if multiple operatives were required due to the nature or requirements of a particular job. Return visits will only have travel charges applied.",
      "There is a minimum order value of the arrival fee and 1 hour on site on all jobs.",
      "Rates are calculated in multiples of half an hour."
    ]
  }
};

/* =====================================================================
   Marketing communications add-on
   Adds a dedicated Marketing Communications tab to the online agreement,
   with Opt in selected by default, and writes the result into a new section
   at the end of the exported Excel Partnership Agreement.
   ===================================================================== */
(function(){
"use strict";
var KEY="bmc-marketing-permission-v1";
var TEXT="We are happy for The Building and Maintenance Company to retain relevant business contact details provided through our working relationship and to use those details to send occasional emails about its services, maintenance support and other relevant business information. These communications may be sent to relevant employees and business contacts within our organisation. Recipients can opt out at any time.";

function getPref(){
  try{return localStorage.getItem(KEY)==="optout"?"optout":"optin";}catch(e){return "optin";}
}
function setPref(v){try{localStorage.setItem(KEY,v);}catch(e){}}

function visibleStep(){
  var a=document.querySelectorAll("#app .step");
  for(var i=0;i<a.length;i++)if(!a[i].hidden)return a[i].id;
  return "";
}

function installMarketingStep(){
  var app=document.getElementById("app"),list=document.getElementById("stepList");
  var sign=document.getElementById("step-sign");
  if(!app||!list||!sign||document.getElementById("step-marketing"))return;

  /* The old single marketing tick on Sign & Send is replaced by this fuller section. */
  var old=document.getElementById("f_marketing");
  if(old){var oldRow=old.closest(".tick");if(oldRow)oldRow.remove();}

  var pref=getPref();
  var sec=document.createElement("section");
  sec.className="step";sec.id="step-marketing";sec.hidden=true;sec.setAttribute("aria-labelledby","h-marketing");
  sec.innerHTML='<div class="step-head"><div><div class="tag">Marketing</div><h2 id="h-marketing">Marketing communications</h2><p>Please confirm whether we may keep relevant business contact details and send occasional BMC service and maintenance information.</p></div></div>'+
    '<fieldset><legend>Marketing communications permission</legend><div class="grid">'+
      '<div class="f full"><span class="lbl" id="l_marketingPermission">Please select your preference</span><div class="seg" role="radiogroup" aria-labelledby="l_marketingPermission">'+
        '<label><input type="radio" name="marketingPermission" value="optin"'+(pref==="optin"?' checked':'')+'><span>Opt in</span></label>'+
        '<label><input type="radio" name="marketingPermission" value="optout"'+(pref==="optout"?' checked':'')+'><span>Opt out</span></label>'+
      '</div></div>'+
      '<div class="f full"><div class="notice" style="margin-top:2px">'+TEXT+'</div></div>'+
    '</div></fieldset>';
  app.insertBefore(sec,sign);

  var signLi=list.lastElementChild;
  var li=document.createElement("li");
  li.innerHTML='<button type="button" id="marketingTab"><span class="n">7</span>Marketing</button>';
  list.insertBefore(li,signLi);
  Array.prototype.forEach.call(list.querySelectorAll("button .n"),function(n,i){n.textContent=i+1;});

  sec.addEventListener("change",function(e){
    if(e.target&&e.target.name==="marketingPermission")setPref(e.target.value);
  });

  function hideMarketing(){sec.hidden=true;var mb=document.getElementById("marketingTab");if(mb)mb.removeAttribute("aria-current");}
  function showMarketing(){
    Array.prototype.forEach.call(app.querySelectorAll(".step"),function(s){s.hidden=true;});
    sec.hidden=false;
    Array.prototype.forEach.call(list.querySelectorAll("button"),function(b){b.removeAttribute("aria-current");});
    var mb=document.getElementById("marketingTab");mb.setAttribute("aria-current","step");
    document.getElementById("introBox").hidden=true;
    document.getElementById("prevBtn").disabled=false;
    var nb=document.getElementById("nextBtn");nb.hidden=false;nb.textContent="Review & sign";
    document.getElementById("pos").textContent="Step 7 of 8";
    window.scrollTo({top:0,behavior:"auto"});
  }
  function syncUI(){
    var id=visibleStep(),pos=document.getElementById("pos"),nb=document.getElementById("nextBtn");
    if(id==="step-marketing"){showMarketing();return;}
    if(id==="step-sign"){pos.textContent="Step 8 of 8";nb.hidden=true;}
    else{
      var originals=Array.prototype.slice.call(app.querySelectorAll(".step")).filter(function(s){return s.id!=="step-marketing";});
      var idx=originals.findIndex(function(s){return s.id===id;});
      if(idx>=0)pos.textContent="Step "+(idx+1)+" of 8";
      if(id==="step-kpi"){nb.hidden=false;nb.textContent="Next";}
    }
  }

  document.getElementById("marketingTab").addEventListener("click",function(e){e.preventDefault();e.stopImmediatePropagation();showMarketing();});

  /* If the user leaves Marketing by clicking another original tab, hide it first. */
  list.addEventListener("click",function(e){
    var b=e.target.closest("button");if(!b||b.id==="marketingTab")return;
    if(!sec.hidden)hideMarketing();
    setTimeout(syncUI,0);
  },true);

  document.getElementById("nextBtn").addEventListener("click",function(e){
    var id=visibleStep();
    if(id==="step-kpi"){
      e.preventDefault();e.stopImmediatePropagation();showMarketing();
    }else if(id==="step-marketing"){
      e.preventDefault();e.stopImmediatePropagation();hideMarketing();
      var sb=list.querySelector('button[data-go="6"]');if(sb)sb.click();setTimeout(syncUI,0);
    }else setTimeout(syncUI,0);
  },true);

  document.getElementById("prevBtn").addEventListener("click",function(e){
    var id=visibleStep();
    if(id==="step-marketing"){
      e.preventDefault();e.stopImmediatePropagation();hideMarketing();
      var kb=list.querySelector('button[data-go="5"]');if(kb)kb.click();setTimeout(syncUI,0);
    }else if(id==="step-sign"){
      e.preventDefault();e.stopImmediatePropagation();showMarketing();
    }else setTimeout(syncUI,0);
  },true);

  syncUI();
}

function installExcelHook(){
  if(!window.BMCExcel||window.BMCExcel._marketingHook)return;
  var original=window.BMCExcel.build;
  var NS="http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  var XMLNS="http://www.w3.org/XML/1998/namespace";
  function rowNo(ref){var m=/([0-9]+)$/.exec(ref||"");return m?+m[1]:0;}
  function col(ref){var m=/^([A-Z]+)/.exec(ref||"");return m?m[1]:"A";}
  function shiftRef(ref,off){return ref.replace(/([A-Z]+)([0-9]+)/g,function(_,c,r){return c+(+r+off);});}
  function setText(doc,cell,text){
    while(cell.firstChild)cell.removeChild(cell.firstChild);
    cell.setAttribute("t","inlineStr");
    var is=doc.createElementNS(NS,"is"),t=doc.createElementNS(NS,"t");
    t.setAttributeNS(XMLNS,"xml:space","preserve");t.textContent=text;is.appendChild(t);cell.appendChild(is);
  }
  function findCell(doc,ref,styleFrom){
    var cells=doc.getElementsByTagNameNS(NS,"c"),i;
    for(i=0;i<cells.length;i++)if(cells[i].getAttribute("r")===ref)return cells[i];
    var rn=rowNo(ref),rows=doc.getElementsByTagNameNS(NS,"row"),row=null;
    for(i=0;i<rows.length;i++)if(+rows[i].getAttribute("r")===rn){row=rows[i];break;}
    if(!row){row=doc.createElementNS(NS,"row");row.setAttribute("r",rn);doc.getElementsByTagNameNS(NS,"sheetData")[0].appendChild(row);}
    var c=doc.createElementNS(NS,"c");c.setAttribute("r",ref);
    if(styleFrom){
      for(i=0;i<cells.length;i++)if(cells[i].getAttribute("r")===styleFrom){var st=cells[i].getAttribute("s");if(st)c.setAttribute("s",st);break;}
    }
    row.appendChild(c);return c;
  }
  function appendMarketing(xml){
    var doc=new DOMParser().parseFromString(xml,"application/xml"),sheetData=doc.getElementsByTagNameNS(NS,"sheetData")[0];
    var rows=Array.prototype.slice.call(sheetData.getElementsByTagNameNS(NS,"row"));
    var max=0;rows.forEach(function(r){max=Math.max(max,+r.getAttribute("r")||0);});
    var start=max+3,srcA=160,srcB=165,off=start-srcA;

    /* Reuse the formatting of the existing Further Information block. */
    rows.filter(function(r){var n=+r.getAttribute("r");return n>=srcA&&n<=srcB;}).forEach(function(r){
      var n=+r.getAttribute("r"),cl=r.cloneNode(true);cl.setAttribute("r",n+off);
      Array.prototype.forEach.call(cl.getElementsByTagNameNS(NS,"c"),function(c){
        c.setAttribute("r",col(c.getAttribute("r"))+(rowNo(c.getAttribute("r"))+off));
        while(c.firstChild)c.removeChild(c.firstChild);c.removeAttribute("t");
      });
      sheetData.appendChild(cl);
    });

    var merges=doc.getElementsByTagNameNS(NS,"mergeCells")[0];
    if(merges){
      var originals=Array.prototype.slice.call(merges.getElementsByTagNameNS(NS,"mergeCell"));
      originals.forEach(function(m){
        var ref=m.getAttribute("ref"),parts=ref.split(":"),a=rowNo(parts[0]),b=rowNo(parts[1]||parts[0]);
        if(a>=srcA&&b<=srcB){var nm=doc.createElementNS(NS,"mergeCell");nm.setAttribute("ref",shiftRef(ref,off));merges.appendChild(nm);}
      });
      merges.setAttribute("count",merges.getElementsByTagNameNS(NS,"mergeCell").length);
    }

    var pref=getPref(),choice=pref==="optout"?"☐ OPT IN     ☒ OPT OUT":"☒ OPT IN     ☐ OPT OUT";
    setText(doc,findCell(doc,"H162","H162"),pref==="optout"?"☐":"☒");
    setText(doc,findCell(doc,"D"+start,"D160"),"MARKETING COMMUNICATIONS PERMISSION");
    setText(doc,findCell(doc,"H"+(start+2),"H162"),choice);
    setText(doc,findCell(doc,"D"+(start+3),"D163"),"The Building and Maintenance Company may retain relevant business contact details provided through our working relationship and use them to send occasional emails about its services, maintenance support and other relevant business information.");
    setText(doc,findCell(doc,"D"+(start+4),"D164"),"These communications may be sent to relevant employees and business contacts within the organisation.");
    setText(doc,findCell(doc,"D"+(start+5),"D165"),"Recipients can opt out at any time.");

    var dim=doc.getElementsByTagNameNS(NS,"dimension")[0];
    if(dim){var dr=dim.getAttribute("ref")||"A1:O1";dim.setAttribute("ref",dr.replace(/:([A-Z]+)[0-9]+$/,":$1"+(start+5)));}
    return new XMLSerializer().serializeToString(doc);
  }

  window.BMCExcel.build=function(S){
    return original.call(window.BMCExcel,S).then(function(blob){
      return blob.arrayBuffer();
    }).then(function(ab){return JSZip.loadAsync(ab);}).then(function(zip){
      return zip.file("xl/worksheets/sheet1.xml").async("string").then(function(xml){
        zip.file("xl/worksheets/sheet1.xml",appendMarketing(xml));
        return zip.generateAsync({type:"blob",compression:"DEFLATE",mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
      });
    });
  };
  window.BMCExcel._marketingHook=true;
}

window.addEventListener("load",function(){installMarketingStep();installExcelHook();});
})();
