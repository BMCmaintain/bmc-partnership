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

/* Draw the reactive rate sheet (from assets/js/config.js) as a picture for the
   workbook's "Reactive Rates" tab, so the Excel file always shows the current rates. */
function loadImg(src){return new Promise(function(res){var i=new Image();i.onload=function(){res(i);};i.onerror=function(){res(null);};i.src=src;});}
function wrap(ctx,text,maxW){var words=String(text).split(" "),lines=[],line="";
  words.forEach(function(w){var t=line?line+" "+w:w;if(ctx.measureText(t).width>maxW&&line){lines.push(line);line=w;}else line=t;});if(line)lines.push(line);return lines;}
function drawRateSheet(){
  var R=window.BMC_CONFIG&&window.BMC_CONFIG.rates;if(!R)return Promise.resolve(null);
  var srcs=["assets/img/bmc-logo.png"];for(var b=1;b<=6;b++)srcs.push("assets/img/badge-"+b+".jpg");
  return Promise.all(srcs.map(loadImg)).then(function(imgs){
    var W=1182,H=1704,c=document.createElement("canvas");c.width=W;c.height=H;
    var x=c.getContext("2d"),RED="#99181c",INK="#1d1d1d",F='"Public Sans", Arial, sans-serif';
    x.fillStyle="#fff";x.fillRect(0,0,W,H);
    // header
    if(imgs[0])x.drawImage(imgs[0],W-235,34,180,175);
    x.fillStyle=INK;x.textBaseline="alphabetic";x.font="400 40px "+F;x.fillText("THE BUILDING MAINTENANCE COMPANY",70,120);
    x.font="400 22px "+F;var tag=["INTEGRITY","SERVICE EXCELLENCE","DELIVERY"],tx=150;
    function dot(cx,cy,r){x.fillStyle=RED;x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.fill();}
    tag.forEach(function(t){dot(tx-18,170,7);x.fillStyle=INK;x.fillText(t,tx,178);tx+=x.measureText(t).width+44;});dot(tx-18,170,7);
    // title
    x.font="700 38px "+F;x.textAlign="center";var tw=x.measureText(R.title).width;
    x.fillStyle=INK;x.fillText(R.title,W/2,290);dot(W/2-tw/2-26,278,8);dot(W/2+tw/2+26,278,8);
    x.fillStyle=INK;x.font="400 24px "+F;x.fillText("Effective from "+R.effective,W/2,336);
    x.strokeStyle=RED;x.lineWidth=3;x.beginPath();x.moveTo(70,370);x.lineTo(W-70,370);x.stroke();
    // tables
    var L=70,colW=[400,(W-140-400)/2,(W-140-400)/2],y=420;
    R.groups.forEach(function(g){
      x.textAlign="left";x.fillStyle=RED;x.font="700 27px "+F;x.fillText(g.name,L,y+44);
      x.fillStyle=INK;x.font="400 19px "+F;x.textAlign="center";
      R.columns.forEach(function(col,i){var cx=L+colW[0]+colW[1]*i+colW[1]/2;wrap(x,col,colW[1]-30).forEach(function(ln,k){x.fillText(ln,cx,y+20+k*24);});});
      y+=74;
      g.rows.forEach(function(r){
        var rowH=70;x.strokeStyle="#333";x.lineWidth=1.5;
        x.strokeRect(L,y,colW[0],rowH);x.strokeRect(L+colW[0],y,colW[1],rowH);x.strokeRect(L+colW[0]+colW[1],y,colW[2],rowH);
        x.textAlign="left";x.fillStyle=INK;x.font="400 21px "+F;
        var ls=wrap(x,r[0],colW[0]-28);ls.forEach(function(ln,k){x.fillText(ln,L+14,y+rowH/2+8-(ls.length-1)*13+k*26);});
        x.textAlign="center";x.font="700 24px "+F;
        r.slice(1).forEach(function(v,i){x.fillText(v,L+colW[0]+colW[1]*i+colW[1]/2,y+rowH/2+9);});
        y+=rowH;});
      y+=34;});
    // uplifts
    x.font="600 22px "+F;x.textAlign="left";var ux=L+20,ug=(W-140)/R.uplifts.length;
    R.uplifts.forEach(function(u,i){var px=L+ug*i+24;dot(px-14,y+2,7);x.fillStyle=INK;x.fillText(u,px,y+10);});
    y+=60;
    // terms
    x.fillStyle=INK;x.font="700 24px "+F;x.fillText("Terms & Conditions",L,y);y+=34;x.font="400 18px "+F;
    R.terms.forEach(function(t,i){var ls=wrap(x,t,W-140-40);x.fillText((i+1)+".",L+4,y);ls.forEach(function(ln,k){x.fillText(ln,L+36,y+k*24);});y+=ls.length*24+10;});
    // accreditation badges
    var bs=imgs.slice(1).filter(Boolean),size=110,gap=(W-140-bs.length*size)/Math.max(1,bs.length-1),by=H-160;
    x.strokeStyle=RED;x.lineWidth=3;x.beginPath();x.moveTo(70,by-30);x.lineTo(W-70,by-30);x.stroke();
    bs.forEach(function(im,i){x.drawImage(im,L+i*(size+gap),by,size,size);});
    return new Promise(function(res){c.toBlob(function(bl){if(!bl)return res(null);bl.arrayBuffer().then(function(ab){res(new Uint8Array(ab));});},"image/png");});
  }).catch(function(){return null;});
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
      return drawRateSheet().then(function(png){
        if(png)zip.file("xl/media/image2.png",png);          // "Reactive Rates" tab picture
        return S.sig?addSignature(zip,S.sig):null;
      });
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
