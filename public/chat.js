const socket = io("http://localhost:4000");
let me="", unread={}, activeChat="";

socket.on("connect", () => {
    const storedUser = localStorage.getItem("alloouser");
    if (storedUser) {
        me = storedUser;
        socket.emit("login", me);
    }
});

function enter() {
    me = document.getElementById("u-in").value.trim();
    if (!me) return;
    localStorage.setItem("alloouser", me);
    socket.emit("login", me);
}

socket.on("login-success", () => {
    document.getElementById("login-page").style.display="none";
    document.getElementById("chat-page").style.display="flex";
});

function send() {
    const txt = document.getElementById("m-in").value.trim();
    const to = document.getElementById("u-to").value;
    if(txt) {
        socket.emit("send-message",{from:me,to:to,text:txt});
        document.getElementById("m-in").value="";
        if(to) activeChat = to;
    }
}

function show(data){
    if(data.to && data.to!==me && data.from!==me) return;
    const div = document.createElement("div");
    div.className = `msg ${data.from===me?'my':'at'}`;
    const toInfo = data.to?`<small>به ${data.to}</small>`:'';
    div.innerHTML=`<strong>${data.from}</strong>${toInfo}<br>${data.text||''}`;
    if(data.audio){
        const container = document.createElement("div");
        container.className='waveform-container';
        const ws = WaveSurfer.create({
            container: container,
            waveColor: data.from===me?'#00e676':'#ff5252',
            progressColor:'#fff',
            cursorColor:'#fff',
            barWidth:2,
            height:50,
            responsive:true
        });
        ws.load(data.audio);
        container.onclick=()=>{ ws.isPlaying()?ws.pause():ws.play(); };
        div.appendChild(container);
    }
    document.getElementById("messages").appendChild(div);
    document.getElementById("messages").scrollTop = 99999;

    if(data.to && data.to===me){
        unread[data.from]=(unread[data.from]||0)+1;
        updateTitle();
        if(Notification.permission==="granted"){
            new Notification(`${data.from} پیام فرستاد`,{body:data.text||'🎵 ویس دریافت شد'});
        }
        if(activeChat!==data.from){ activeChat=data.from; document.getElementById('u-to').value=data.from; }
    }
}

function updateTitle(){
    let total = Object.values(unread).reduce((a,b)=>a+b,0);
    document.title = total?`(${total}) ALLOO`:'ALLOO';
}

socket.on("receive-message",show);
socket.on("receive-voice",show);
socket.on("load-messages",l=>l.forEach(show));

socket.on("users", us => {
    const ul = document.getElementById("u-list");
    ul.innerHTML='';
    us.forEach((u,i)=>{
        const div = document.createElement("div");
        div.textContent=u.name + (unread[u.name]?` (${unread[u.name]})`:'' );
        setTimeout(()=>div.classList.add("show"),i*100);
        ul.appendChild(div);
    });
    const sel = document.getElementById("u-to");
    const prev = sel.value;
    sel.innerHTML='<option value="">عمومی</option>'+us.map(u=>`<option value="${u.name}">${u.name}</option>`).join('');
    if(us.find(u=>u.name===prev)) sel.value=prev;
});

// 🎤 Voice recording
let r;
document.getElementById("v-btn").onclick = async function() {
    if(r && r.state==="recording"){ r.stop(); this.textContent="🎤"; }
    else{
        const s = await navigator.mediaDevices.getUserMedia({audio:true});
        r = new MediaRecorder(s);
        let ch=[];
        r.ondataavailable = e => ch.push(e.data);
        r.onstop = async ()=>{
            const b = new Blob(ch,{type:'audio/webm'});
            const fr = new FileReader();
            const to = document.getElementById("u-to").value;
            fr.onloadend = ()=>{
                socket.emit("send-voice",{from:me,to:to,audio:fr.result});
            };
            fr.readAsDataURL(b);
        };
        r.start(); this.textContent="⏹";
    }
};

// Theme toggle
document.getElementById("theme-toggle").onclick=()=>{ document.body.classList.toggle('light'); };
document.getElementById("signout-btn").onclick=()=>{ localStorage.removeItem("alloouser"); location.reload(); };

if(Notification.permission!=="granted") Notification.requestPermission();
window.addEventListener("focus",()=>{ unread={}; updateTitle(); });