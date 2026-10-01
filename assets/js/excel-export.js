/* Fills the original BMC Partnership Agreement workbook with the customer's answers
   and saves it as an .xlsx file. Everything runs in the browser; nothing is uploaded. */
(function(){
"use strict";
var NS="http://schemas.openxmlformats.org/spreadsheetml/2006/main";
var XML_NS="http://www.w3.org/XML/1998/namespace";

function colNum(c){var n=0;for(var i=0;i<c.length;i++)n=n*26+(c.charCodeAt(i)-64);return n;}
function split(ref){var m=/^([A-Z]+)(\d+)$/.exec(ref);return {col:m[1],row:+m[2]};}

function Sheet(xmlText){
  this.doc=new DOMParser().parseFromString(xmlText,"application/xml");
  this.data=this.doc.getElementsByTagNameNS(NS,"sheetData")[0];
}
Sheet.prototype.row=function(r){
  var rows=this.data.getElementsByTagNameNS(NS,"row");
  for(var i=0;i<rows.length;i++){var rr=+rows[i].getAttribute("r");
    if(rr===r)return rows[i];
    if(rr>r){var n=this.doc.createElementNS(NS,"row");n.setAttribute("r",r);this.data.insertBefore(n,rows[i]);return n;}}
  var e=this.doc.createElementNS(NS,"row");e.setAttribute("r",r);this.data.appendChild(e);return e;
};
Sheet.prototype.cell=function(ref){
  var p=split(ref),row=this.row(p.row),cells=row.getElementsByTagNameNS(NS,"c");
  for(var i=0;i<cells.length;i++){var cc=/^[A-Z]+/.exec(cells[i].getAttribute("r"))[0];
    if(cc===p.col)return cells[i];
    if(colNum(cc)>colNum(p.col)){var n=this.doc.createElementNS(NS,"c");n.setAttribute("r",ref);row.insertBefore(n,cells[i]);return n;}}
  var e=this.doc.createElementNS(NS,"c");e.setAttribute("r",ref);row.appendChild(e);return e;
};
Sheet.prototype.set=function(ref,text){
  if(text==null)return;text=String(text);
  var c=this.cell(ref);while(c.firstChild)c.removeChild(c.firstChild);c.removeAttribute("t");
  if(text==="")return;
  c.setAttribute("t","inlineStr");
  var is=this.doc.createElementNS(NS,"is"),t=this.doc.createElementNS(NS,"t");
  t.setAttributeNS(XML_NS,"xml:space","preserve");t.textContent=text;is.appendChild(t);c.appendChild(is);
};
Sheet.prototype.xml=function(){return new XMLSerializer().serializeToString(this.doc);};

function b64ToBytes(b64){var bin=atob(b64),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u;}
function ukDate(v){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v||"");return m?m[3]+"/"+m[2]+"/"+m[1]:(v||"");}

/* Put the drawn signature into the "Signed" box as a picture */
function addSignature(zip,dataUrl){
  var relPath="xl/drawings/_rels/drawing1.xml.rels",drawPath="xl/drawings/drawing1.xml";
  return Promise.all([zip.file(relPath).async("string"),zip.file(drawPath).async("string")]).then(function(r){
    var rels=r[0],draw=r[1],id="rIdClientSig";
    zip.file("xl/media/client-signature.png",b64ToBytes(dataUrl.split(",")[1]));
    rels=rels.replace("</Relationships>",'<Relationship Id="'+id+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/client-signature.png"/></Relationships>');
    // Signed box = F171:G171  (cols are zero-based in drawings: F=5, row 171 => 170)
    var anchor='<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>5</xdr:col><xdr:colOff>20000</xdr:colOff><xdr:row>169</xdr:row><xdr:rowOff>40000</xdr:rowOff></xdr:from>'+
      '<xdr:to><xdr:col>7</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>171</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>'+
      '<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="9001" name="Client signature"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>'+
      '<xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="'+id+'"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>'+
      '<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor>';
    if(draw.indexOf('xmlns:a=')<0)draw=draw.replace("<xdr:wsDr ",'<xdr:wsDr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ');
    draw=draw.replace("</xdr:wsDr>",anchor+"</xdr:wsDr>");
    zip.file(relPath,rels);zip.file(drawPath,draw);
  });
}

window.BMCExcel={
  build:function(S){
    var M=window.BMC_CELLS,zip;
    return JSZip.loadAsync(b64ToBytes(window.BMC_TEMPLATE_XLSX)).then(function(z){zip=z;
      return Promise.all([zip.file("xl/worksheets/sheet1.xml").async("string"),zip.file("xl/worksheets/sheet4.xml").async("string")]);
    }).then(function(x){
      var s1=new Sheet(x[0]),s4=new Sheet(x[1]);
      var V=function(k){return S[k]==null?"":String(S[k]);};
      var special={
        incDate:ukDate(S.incDate),startDate:ukDate(S.startDate),ratesUntil:ukDate(S.ratesUntil),sigDate:ukDate(S.sigDate),
        type:S.type==="Other"&&S.typeOther?S.typeOther:V("type"),
        group:S.group==="Yes"&&S.groupName?"Yes - "+S.groupName:V("group"),
        payerDetails:S.payer==="Your clients"?V("payerDetails"):"",
        commOther:S.comm2?V("commOther"):""
      };
      Object.keys(M.F).forEach(function(k){
        var val=k in special?special[k]:V(k);
        if(k==="itReq"&&!val)return;              // keep the template's "N/A"
        s1.set(M.F[k],val);
      });
      var ticks={payerCompany:S.payer==="Company stated above",payerClients:S.payer==="Your clients"};
      Object.keys(M.TICK).forEach(function(k){var on=k in ticks?ticks[k]:!!S[k];s1.set(M.TICK[k],on?M.TICKED:M.BOX);});
      Object.keys(M.ONLY).forEach(function(k){var reg=k.replace("only_","reg_"),v=S[reg]?S[k]:"";
        s1.set(M.ONLY[k],v==="Yes"?M.ONLY_OPTS[1]:v==="No"?M.ONLY_OPTS[2]:M.ONLY_OPTS[0]);});
      (S.kpis||[]).filter(function(r){return r&&(r.name||r.desc||r.target||r.info);}).slice(0,M.KPI.length).forEach(function(r,i){
        var c=M.KPI[i];s4.set(c.name,r.name||"");s4.set(c.desc,r.desc||"");s4.set(c.target,r.target||"");s4.set(c.info,r.info||"");});
      zip.file("xl/worksheets/sheet1.xml",s1.xml());zip.file("xl/worksheets/sheet4.xml",s4.xml());
      return S.sig?addSignature(zip,S.sig):null;
    }).then(function(){
      return zip.generateAsync({type:"blob",compression:"DEFLATE",mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    });
  },
  fileName:function(S){var n=(S.company||"Client").replace(/[\\\/:*?"<>|]+/g,"").trim()||"Client";return "BMC Partnership Agreement - "+n+".xlsx";},
  download:function(S){
    var self=this;
    return this.build(S).then(function(blob){
      var name=self.fileName(S);
      if(window.navigator&&window.navigator.msSaveOrOpenBlob){window.navigator.msSaveOrOpenBlob(blob,name);return name;}
      var url=URL.createObjectURL(blob),a=document.createElement("a");
      a.href=url;a.download=name;a.rel="noopener";document.body.appendChild(a);a.click();
      setTimeout(function(){URL.revokeObjectURL(url);a.remove();},4000);
      return name;
    });
  }
};
})();
