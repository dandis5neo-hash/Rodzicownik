document.addEventListener("DOMContentLoaded", function() {
    
    // ==========================================
    // 00. INICJALIZACJA FIREBASE
    // ==========================================
    const firebaseConfig = {
        apiKey: "AIzaSyAOzWpWSjJ9f0e4zX5ZU4YVN0mVFlgJkCk",
        authDomain: "rodzicownik-26.firebaseapp.com",
        databaseURL: "https://rodzicownik-26-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "rodzicownik-26",
        storageBucket: "rodzicownik-26.firebasestorage.app",
        messagingSenderId: "629922677051",
        appId: "1:629922677051:web:53d77888cfe6ab46f6b71e"
    };
    
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const auth = firebase.auth();
    const database = firebase.database();
    
    let currentUserUid = null;

    // ==========================================
    // 01. SILNIK SYNCHRONIZACJI Z CHMURĄ
    // ==========================================
    function zapiszWChmurze(klucz, dane) {
        // 1. Zapis lokalny dla trybu offline
        localStorage.setItem(klucz, typeof dane === 'object' ? JSON.stringify(dane) : dane);
        // 2. Zapis w chmurze
        if (currentUserUid) {
            database.ref('users/' + currentUserUid + '/' + klucz).set(dane);
        }
    }

    function usunZChmury(klucz) {
        localStorage.removeItem(klucz);
        if (currentUserUid) {
            database.ref('users/' + currentUserUid + '/' + klucz).remove();
        }
    }

    // ==========================================
    // 0. BAZY DANYCH I SYSTEM PREMIUM
    // ==========================================
    const PULA_KODOW_PREMIUM = [
        "RDZ-A1B2", "RDZ-C3D4", "RDZ-E5F6", "RDZ-G7H8", "RDZ-I9J0", "RDZ-K1L2", "RDZ-M3N4", "RDZ-O5P6", "RDZ-Q7R8", "RDZ-S9T0",
        "RDZ-U1V2", "RDZ-W3X4", "RDZ-Y5Z6", "RDZ-A7B8", "RDZ-C9D0", "RDZ-E1F2", "RDZ-G3H4", "RDZ-I5J6", "RDZ-K7L8", "RDZ-M9N0",
        "RDZ-O1P2", "RDZ-Q3R4", "RDZ-S5T6", "RDZ-U7V8", "RDZ-W9X0", "RDZ-Y1Z2", "RDZ-A3B4", "RDZ-C5D6", "RDZ-E7F8", "RDZ-G9H0"
    ];

    let czyPremiumPelne = localStorage.getItem("rodzicownikPremium") === "true";
    let koniecTrialu = parseInt(localStorage.getItem("premiumTrialEnd")) || 0;
    let czyTrial = false;
    let pozostaloTrialText = "";

    if (!czyPremiumPelne && koniecTrialu > Date.now()) {
        czyTrial = true;
        let resztaGodzin = Math.floor((koniecTrialu - Date.now()) / (1000 * 60 * 60));
        pozostaloTrialText = `${Math.floor(resztaGodzin / 24)} dni i ${resztaGodzin % 24} godz.`;
    } else if (!czyPremiumPelne && koniecTrialu > 0 && koniecTrialu <= Date.now()) {
        usunZChmury("premiumTrialEnd");
        koniecTrialu = 0;
    }
    
    let czyPremium = czyPremiumPelne || czyTrial;

    let bazaProfili = JSON.parse(localStorage.getItem("medBazaProfili")) || [{ id: Date.now(), imie: "", waga: "", alergie: "" }];
    let aktywnyProfilId = localStorage.getItem("medAktywnyProfilId") || bazaProfili[0].id;
    let aktualnyPin = localStorage.getItem("rodzicPin") || "1234";
    let mojePunkty = parseInt(localStorage.getItem("gryPunkty")) || 0; 
    let bazaZadan = JSON.parse(localStorage.getItem("gryZadania")) || [{ id: 1, nazwa: "Pościelenie łóżka", punkty: 10 }]; 
    let bazaNagrod = JSON.parse(localStorage.getItem("gryNagrody")) || [{ id: 1, nazwa: "30 min bajek", koszt: 50 }]; 
    let oczekujaceZadania = JSON.parse(localStorage.getItem("gryOczekujace")) || [];
    let bazaNotatek = JSON.parse(localStorage.getItem("narzedziaNotatki")) || [];
    let saldoFinansow = parseFloat(localStorage.getItem("grySaldo")) || 0.00; 
    let historiaFinansow = JSON.parse(localStorage.getItem("gryHistoriaFinansow")) || [];
    let bazaKalendarz = JSON.parse(localStorage.getItem("narzedziaKalendarz")) || [];
    let bazaCzatu = JSON.parse(localStorage.getItem("narzedziaAsystent")) || [];
    let bazaPakowanie = JSON.parse(localStorage.getItem("narzedziaPakowanie")) || [];
    let bazaOsiagniecia = JSON.parse(localStorage.getItem("narzedziaOsiagniecia")) || [];
    let bazaPlan = JSON.parse(localStorage.getItem("narzedziaPlan")) || [];
    let bazaPosilki = JSON.parse(localStorage.getItem("narzedziaPosilki")) || [];
    let bazaSejf = JSON.parse(localStorage.getItem("narzedziaSejf")) || [];
    let bazaRozmiary = JSON.parse(localStorage.getItem("narzedziaRozmiary")) || [];
    let bazaCytaty = JSON.parse(localStorage.getItem("narzedziaCytaty")) || [];
    let bazaKontaktow = JSON.parse(localStorage.getItem("narzedziaKontakty")) || [];
    let mojaApteczka = JSON.parse(localStorage.getItem("medApteczka")) || [];
    let bazaZdarzen = JSON.parse(localStorage.getItem("medHistoria")) || []; 
    let bazaKarmienie = JSON.parse(localStorage.getItem("narzedziaKarmienie")) || [];
    let bazaBilans = JSON.parse(localStorage.getItem("narzedziaBilans")) || [];
    let bazaSzczepien = JSON.parse(localStorage.getItem("narzedziaSzczepienia")) || [];
    let bazaEkrany = JSON.parse(localStorage.getItem("narzedziaEkrany")) || [];

    // ==========================================
    // LOGIKA AUTORYZACJI FIREBASE (AUTH STATE)
    // ==========================================
    const ekranLogowania = document.getElementById("ekranLogowania");
    const pasekDolny = document.getElementById("pasekDolny");
    const ekranStart = document.getElementById("ekranStart");

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUserUid = user.uid;
            console.log("Zalogowano! Synchronizacja z bazą Firebase...");
            
            // POBIERANIE DANYCH Z CHMURY
            database.ref('users/' + currentUserUid).once('value').then(snapshot => {
                const daneZChmury = snapshot.val();
                if (daneZChmury) {
                    // Nadpisujemy lokalne zmienne danymi z serwera
                    if (daneZChmury.rodzicownikPremium) czyPremiumPelne = (daneZChmury.rodzicownikPremium === "true");
                    czyPremium = czyPremiumPelne || czyTrial;
                    if (daneZChmury.medBazaProfili) bazaProfili = daneZChmury.medBazaProfili;
                    if (daneZChmury.medAktywnyProfilId) aktywnyProfilId = daneZChmury.medAktywnyProfilId;
                    if (daneZChmury.rodzicPin) aktualnyPin = daneZChmury.rodzicPin;
                    if (daneZChmury.gryPunkty) mojePunkty = parseInt(daneZChmury.gryPunkty);
                    if (daneZChmury.grySaldo) saldoFinansow = parseFloat(daneZChmury.grySaldo);
                    
                    if (daneZChmury.medApteczka) mojaApteczka = daneZChmury.medApteczka;
                    if (daneZChmury.medHistoria) bazaZdarzen = daneZChmury.medHistoria;
                    if (daneZChmury.narzedziaKarmienie) bazaKarmienie = daneZChmury.narzedziaKarmienie;
                    if (daneZChmury.narzedziaBilans) bazaBilans = daneZChmury.narzedziaBilans;
                    if (daneZChmury.narzedziaSzczepienia) bazaSzczepien = daneZChmury.narzedziaSzczepienia;
                    if (daneZChmury.gryOczekujace) oczekujaceZadania = daneZChmury.gryOczekujace;
                    if (daneZChmury.gryZadania) bazaZadan = daneZChmury.gryZadania;
                    if (daneZChmury.gryNagrody) bazaNagrod = daneZChmury.gryNagrody;
                    if (daneZChmury.gryHistoriaFinansow) historiaFinansow = daneZChmury.gryHistoriaFinansow;
                    if (daneZChmury.narzedziaNotatki) bazaNotatek = daneZChmury.narzedziaNotatki;
                    if (daneZChmury.narzedziaKalendarz) bazaKalendarz = daneZChmury.narzedziaKalendarz;
                    if (daneZChmury.narzedziaPakowanie) bazaPakowanie = daneZChmury.narzedziaPakowanie;
                    if (daneZChmury.narzedziaOsiagniecia) bazaOsiagniecia = daneZChmury.narzedziaOsiagniecia;
                    if (daneZChmury.narzedziaPlan) bazaPlan = daneZChmury.narzedziaPlan;
                    if (daneZChmury.narzedziaPosilki) bazaPosilki = daneZChmury.narzedziaPosilki;
                    if (daneZChmury.narzedziaSejf) bazaSejf = daneZChmury.narzedziaSejf;
                    if (daneZChmury.narzedziaRozmiary) bazaRozmiary = daneZChmury.narzedziaRozmiary;
                    if (daneZChmury.narzedziaCytaty) bazaCytaty = daneZChmury.narzedziaCytaty;
                    if (daneZChmury.narzedziaKontakty) bazaKontaktow = daneZChmury.narzedziaKontakty;
                    if (daneZChmury.narzedziaEkrany) bazaEkrany = daneZChmury.narzedziaEkrany;
                    if (daneZChmury.narzedziaAsystent) bazaCzatu = daneZChmury.narzedziaAsystent;
                    
                    // Bezpieczna kopia w localStorage
                    Object.keys(daneZChmury).forEach(key => {
                        let v = daneZChmury[key];
                        localStorage.setItem(key, typeof v === 'object' ? JSON.stringify(v) : v);
                    });
                    
                    odswiezWszystkieWidoki();
                } else {
                    // Pierwsze logowanie konta -> Wypychamy obecne lokalne dane do chmury!
                    zapiszLokalneDaneDoChmury();
                }
            });

            wszystkieEkrany.forEach(e => { if(e) e.classList.add("ukryty"); });
            ekranStart.classList.remove("ukryty");
            pasekDolny.classList.remove("ukryty");
            document.getElementById("tytulAplikacji").innerText = "Rodzicownik 📔💙";

        } else {
            currentUserUid = null;
            wszystkieEkrany.forEach(e => { if(e) e.classList.add("ukryty"); });
            ekranLogowania.classList.remove("ukryty");
            pasekDolny.classList.add("ukryty");
            document.getElementById("tytulAplikacji").innerText = "Logowanie";
        }
    });

    function zapiszLokalneDaneDoChmury() {
        if(!currentUserUid) return;
        const updates = {};
        if(czyPremiumPelne) updates['rodzicownikPremium'] = "true";
        updates['rodzicPin'] = aktualnyPin;
        updates['medBazaProfili'] = bazaProfili;
        updates['medAktywnyProfilId'] = aktywnyProfilId;
        updates['medApteczka'] = mojaApteczka;
        updates['medHistoria'] = bazaZdarzen;
        updates['narzedziaKarmienie'] = bazaKarmienie;
        updates['narzedziaBilans'] = bazaBilans;
        updates['narzedziaSzczepienia'] = bazaSzczepien;
        updates['gryPunkty'] = mojePunkty;
        updates['gryOczekujace'] = oczekujaceZadania;
        updates['gryZadania'] = bazaZadan;
        updates['gryNagrody'] = bazaNagrod;
        updates['grySaldo'] = saldoFinansow;
        updates['gryHistoriaFinansow'] = historiaFinansow;
        updates['narzedziaNotatki'] = bazaNotatek;
        updates['narzedziaKalendarz'] = bazaKalendarz;
        updates['narzedziaPakowanie'] = bazaPakowanie;
        updates['narzedziaOsiagniecia'] = bazaOsiagniecia;
        updates['narzedziaPlan'] = bazaPlan;
        updates['narzedziaPosilki'] = bazaPosilki;
        updates['narzedziaSejf'] = bazaSejf;
        updates['narzedziaRozmiary'] = bazaRozmiary;
        updates['narzedziaCytaty'] = bazaCytaty;
        updates['narzedziaKontakty'] = bazaKontaktow;
        updates['narzedziaEkrany'] = bazaEkrany;
        updates['narzedziaAsystent'] = bazaCzatu;
        
        database.ref('users/' + currentUserUid).set(updates);
    }

    function odswiezWszystkieWidoki() {
        odswiezWidokPulpitu(); renderujWybierakProfili(); renderujKarmienie(); renderujBilans();
        renderujSzczepienia(); odswiezLeki(); odswiezZdarzenia(); aktualizujKonto();
        renderujTransakcje(); renderujNotatki(); renderujKalendarz(); renderujPlan();
        renderujPosilki(); renderujEkrany(); renderujSejf(); renderujRozmiary();
        renderujCytaty(); renderujKontakty(); renderujPakowanie(); renderujOsiagniecia();
        aktualizujPortfel(); renderujOczekujace(); renderujZadania(); renderujNagrody(); renderujCzat();
    }

    // Listenery Formularza Logowania
    document.getElementById("btnZaloguj").addEventListener("click", () => {
        const email = document.getElementById("loginEmail").value.trim(); const pass = document.getElementById("loginHaslo").value.trim();
        if(!email || !pass) return alert("Podaj adres e-mail i hasło!");
        auth.signInWithEmailAndPassword(email, pass).catch(error => { alert("Błąd logowania. Sprawdź e-mail i hasło."); });
    });

    document.getElementById("btnZarejestruj").addEventListener("click", () => {
        const email = document.getElementById("loginEmail").value.trim(); const pass = document.getElementById("loginHaslo").value.trim();
        if(!email || !pass) return alert("Podaj adres e-mail i hasło do rejestracji!");
        auth.createUserWithEmailAndPassword(email, pass).then(() => { alert("Konto zostało utworzone!"); }).catch(error => { alert("Błąd: " + error.message); });
    });

    if(document.getElementById("btnResetHasla")) {
        document.getElementById("btnResetHasla").addEventListener("click", () => {
            const email = document.getElementById("loginEmail").value.trim();
            if(!email) { return alert("Wpisz swój adres e-mail w polu u góry i kliknij ponownie."); }
            auth.sendPasswordResetEmail(email).then(() => { alert("Wysłano link do zmiany hasła! Sprawdź skrzynkę."); }).catch((error) => { alert("Błąd: " + error.message); });
        });
    }

    if(document.getElementById("btnWyloguj")) {
        document.getElementById("btnWyloguj").addEventListener("click", () => { if(confirm("Na pewno chcesz się wylogować?")) { auth.signOut(); } });
    }

    // ==========================================
    // 1. ZARZĄDZANIE NAWIGACJĄ I EKRANAMI
    // ==========================================
    const btnNavStart = document.getElementById("navStart"); const btnNavKalendarz = document.getElementById("navKalendarz"); const btnNavProfil = document.getElementById("navProfil"); const ekranDziecka = document.getElementById("ekranDziecka");
    const wszystkieEkrany = [ 
        ekranStart, document.getElementById("ekranProfil"), document.getElementById("ekranZdrowie"), 
        document.getElementById("ekranObowiazki"), document.getElementById("ekranFinanse"), document.getElementById("ekranNotatki"), 
        document.getElementById("ekranKalendarz"), document.getElementById("ekranKontakty"), document.getElementById("ekranStoper"), 
        document.getElementById("ekranRozmiary"), document.getElementById("ekranCytaty"), document.getElementById("ekranPlan"), 
        document.getElementById("ekranPosilki"), document.getElementById("ekranSejf"), document.getElementById("ekranAsystent"), 
        document.getElementById("ekranPakowanie"), document.getElementById("ekranOsiagniecia"), 
        document.getElementById("ekranPremium"), document.getElementById("ekranBlik"), document.getElementById("ekranKarmienie"), 
        document.getElementById("ekranBilans"), document.getElementById("ekranEkrany"), document.getElementById("ekranBackup"), ekranDziecka, ekranLogowania
    ];

    function czyscPasekNawigacji() { btnNavStart.classList.remove("aktywny"); btnNavKalendarz.classList.remove("aktywny"); btnNavProfil.classList.remove("aktywny"); }
    function pokazEkran(ekranDoPokazania, tytul) {
        wszystkieEkrany.forEach(e => { if(e) e.classList.add("ukryty"); }); 
        if(ekranDoPokazania) ekranDoPokazania.classList.remove("ukryty");
        document.getElementById("tytulAplikacji").innerText = tytul;
        if (ekranDoPokazania === ekranDziecka || ekranDoPokazania === document.getElementById("ekranPremium") || ekranDoPokazania === document.getElementById("ekranBlik") || ekranDoPokazania === ekranLogowania) {
            pasekDolny.classList.add("ukryty"); 
        } else { pasekDolny.classList.remove("ukryty"); }
    }

    function odswiezWidokPulpitu() {
        const baner = document.getElementById("banerPremiumPulpit"); 
        const reklamy = document.querySelectorAll(".ad-banner");
        const napisAsystent = document.getElementById("napisAsystentPulpit");
        const napisSejf = document.getElementById("napisSejfPulpit");
        
        if (czyPremiumPelne) {
            if(baner) baner.style.display = "none";
            if(napisSejf) napisSejf.innerText = "Sejf Dokumentów";
            if(napisAsystent) napisAsystent.innerText = "Asystent D@niel (Premium)";
            reklamy.forEach(r => r.style.display = "none");
            if(document.getElementById("kalendarzDarmowy")) document.getElementById("kalendarzDarmowy").classList.add("ukryty");
            if(document.getElementById("kalendarzPremium")) document.getElementById("kalendarzPremium").classList.remove("ukryty");
        } else if (czyTrial) {
            if(baner) { baner.style.display = "flex"; baner.innerHTML = `<div class="premium-banner-ikona">⏳</div><div class="premium-banner-tekst"><strong style="color:#10b981;">Wersja Próbna Premium</strong><span>Pozostało: ${pozostaloTrialText}</span></div><div class="premium-banner-strzalka">➤</div>`; }
            if(napisSejf) napisSejf.innerText = "Sejf Dokumentów";
            if(napisAsystent) napisAsystent.innerText = "D@niel (Próbne Premium)";
            reklamy.forEach(r => r.style.display = "none");
            if(document.getElementById("kalendarzDarmowy")) document.getElementById("kalendarzDarmowy").classList.add("ukryty");
            if(document.getElementById("kalendarzPremium")) document.getElementById("kalendarzPremium").classList.remove("ukryty");
        } else {
            if(baner) { baner.style.display = "flex"; baner.innerHTML = `<div class="premium-banner-ikona">👑</div><div class="premium-banner-tekst"><strong>Odblokuj wersję Premium!</strong><span>Więcej profili, Kopia zapasowa, Sejf</span></div><div class="premium-banner-strzalka">➤</div>`; }
            if(napisAsystent) napisAsystent.innerText = "Asystent D@niel (Wersja Darmowa)";
            reklamy.forEach(r => r.style.display = "flex");
            if(document.getElementById("kalendarzDarmowy")) document.getElementById("kalendarzDarmowy").classList.remove("ukryty");
            if(document.getElementById("kalendarzPremium")) document.getElementById("kalendarzPremium").classList.add("ukryty");
        }
    }

    btnNavStart.addEventListener("click", () => { pokazEkran(ekranStart, "Rodzicownik 📔💙"); czyscPasekNawigacji(); btnNavStart.classList.add("aktywny"); odswiezWidokPulpitu(); });
    btnNavKalendarz.addEventListener("click", () => { pokazEkran(wszystkieEkrany[6], "Kalendarz 📅"); czyscPasekNawigacji(); btnNavKalendarz.classList.add("aktywny"); renderujKalendarz(); });
    btnNavProfil.addEventListener("click", () => { pokazEkran(wszystkieEkrany[1], "Profil 👤"); czyscPasekNawigacji(); btnNavProfil.classList.add("aktywny"); });
    
    document.getElementById("kafelekZdrowie").addEventListener("click", () => pokazEkran(wszystkieEkrany[2], "Apteczka 🩺"));
    document.getElementById("kafelekObowiazki").addEventListener("click", () => { pokazEkran(wszystkieEkrany[3], "Punkty ⭐"); renderujOczekujace(); });
    document.getElementById("kafelekFinanse").addEventListener("click", () => pokazEkran(wszystkieEkrany[4], "Wydatki 💰"));
    document.getElementById("kafelekNotatki").addEventListener("click", () => pokazEkran(wszystkieEkrany[5], "Notatki 📝"));
    document.getElementById("kafelekKontakty").addEventListener("click", () => pokazEkran(wszystkieEkrany[7], "Telefony 📞"));
    document.getElementById("kafelekStoper").addEventListener("click", () => pokazEkran(wszystkieEkrany[8], "Minutnik ⏳"));
    document.getElementById("kafelekRozmiary").addEventListener("click", () => pokazEkran(wszystkieEkrany[9], "Rozmiary 👕"));
    document.getElementById("kafelekCytaty").addEventListener("click", () => pokazEkran(wszystkieEkrany[10], "Złote Myśli 💬"));
    document.getElementById("kafelekPlan").addEventListener("click", () => pokazEkran(wszystkieEkrany[11], "Plan Zajęć 📚"));
    document.getElementById("kafelekPosilki").addEventListener("click", () => pokazEkran(wszystkieEkrany[12], "Jadłospis 🍴"));
    document.getElementById("kafelekPakowanie").addEventListener("click", () => pokazEkran(wszystkieEkrany[15], "Pakowanie 🧳"));
    document.getElementById("kafelekOsiagniecia").addEventListener("click", () => pokazEkran(wszystkieEkrany[16], "Osiągnięcia 🏆"));
    document.getElementById("kafelekEkrany").addEventListener("click", () => pokazEkran(document.getElementById("ekranEkrany"), "Czas Ekranowy 💻"));
    
    document.getElementById("kafelekKarmienie").addEventListener("click", () => { const now = new Date(); document.getElementById("noweKarmienieData").value = now.toISOString().split('T')[0]; document.getElementById("noweKarmienieCzas").value = now.toTimeString().substring(0,5); pokazEkran(document.getElementById("ekranKarmienie"), "Karmienie 🍼"); });
    document.getElementById("kafelekBilans").addEventListener("click", () => { document.getElementById("nowyBilansData").value = new Date().toISOString().split('T')[0]; document.getElementById("noweSzczepienieData").value = new Date().toISOString().split('T')[0]; pokazEkran(document.getElementById("ekranBilans"), "Bilans 📈"); });
    document.getElementById("kafelekAsystent").addEventListener("click", () => { pokazEkran(wszystkieEkrany[14], "Asystent D@niel 🤖"); wczytajAktywnyProfil(); renderujCzat(); });
    
    document.getElementById("kafelekSejf").addEventListener("click", () => { 
        if(!czyPremium) { pokazEkran(document.getElementById("ekranPremium"), "Konto Premium 👑"); } else {
            const p = aktualnyPin === "1234" ? " (Domyślny to: 1234)" : ""; 
            if(prompt(`Podaj PIN rodzica${p}:`) === aktualnyPin) { pokazEkran(wszystkieEkrany[13], "Sejf Dokumentów 🗂️"); renderujSejf(); } else { alert("Błędny PIN!"); } 
        }
    });

    document.getElementById("kafelekBackup").addEventListener("click", () => {
        if(!czyPremium) { pokazEkran(document.getElementById("ekranPremium"), "Konto Premium 👑"); } else { pokazEkran(document.getElementById("ekranBackup"), "Kopia Zapasowa 💾"); }
    });

    document.getElementById("kafelekTrybDziecka").addEventListener("click", () => { pokazEkran(ekranDziecka, "Tryb Dziecka 🚀"); renderujWidokDziecka(); });
    
    const banerPremium = document.getElementById("banerPremiumPulpit");
    if(banerPremium) { banerPremium.addEventListener("click", () => { pokazEkran(document.getElementById("ekranPremium"), "Konto Premium 👑"); }); }
    
    const przyciskKup = document.getElementById("btnKupPremium");
    if(przyciskKup) { przyciskKup.addEventListener("click", () => { pokazEkran(document.getElementById("ekranBlik"), "Aktywacja Premium"); }); }

    const przyciskTrial = document.getElementById("btnTrialPremium");
    if(przyciskTrial) {
        if(localStorage.getItem("premiumTrialEnd") || czyPremiumPelne) { przyciskTrial.style.display = "none"; }
        przyciskTrial.addEventListener("click", () => {
            if(localStorage.getItem("premiumTrialEnd")) return alert("Wykorzystałeś już swój darmowy okres próbny!");
            zapiszWChmurze("premiumTrialEnd", Date.now() + (3 * 24 * 60 * 60 * 1000));
            alert("🎉 Gratulacje! Rozpocząłeś 3-dniowy okres próbny wersji Premium. Masz dostęp do wszystkich funkcji!"); location.reload();
        });
    }

    const przyciskAktywuj = document.getElementById("btnAktywujPremium");
    if(przyciskAktywuj) {
        przyciskAktywuj.addEventListener("click", () => {
            const wpisanyKod = document.getElementById("inputKodAktywacyjny").value.trim().toUpperCase();
            if (PULA_KODOW_PREMIUM.includes(wpisanyKod)) {
                zapiszWChmurze("rodzicownikPremium", "true"); czyPremium = true; czyPremiumPelne = true;
                alert("✅ Gratulacje! Kod poprawny. Wersja Premium została odblokowana na zawsze!");
                document.getElementById("inputKodAktywacyjny").value = ""; btnNavStart.click(); odswiezWidokPulpitu(); 
            } else if (wpisanyKod === "") { alert("Wpisz kod, który otrzymałeś w wiadomości SMS.");
            } else { alert("❌ Błędny kod aktywacyjny! Upewnij się, że wpisałeś go poprawnie."); }
        });
    }

    const powroty = ["btnWrocZdrowie", "btnWrocObowiazki", "btnWrocFinanse", "btnWrocNotatki", "btnWrocKontakty", "btnWrocStoper", "btnWrocRozmiary", "btnWrocCytaty", "btnWrocPlan", "btnWrocPosilki", "btnWrocPakowanie", "btnWrocOsiagniecia", "btnWrocSejf", "btnWrocAsystent", "btnWrocPremium", "btnWrocBlik", "btnWrocKarmienie", "btnWrocBilans", "btnWrocEkrany", "btnWrocBackup"];
    powroty.forEach(id => { if(document.getElementById(id)) { document.getElementById(id).addEventListener("click", () => btnNavStart.click()); } });

    if(document.getElementById("banerKalendarzPremium")) { document.getElementById("banerKalendarzPremium").addEventListener("click", () => { btnNavStart.click(); if(document.getElementById("banerPremiumPulpit")) document.getElementById("banerPremiumPulpit").click(); }); }
    odswiezWidokPulpitu();

    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault(); deferredPrompt = e; const installBtn = document.getElementById('btnInstallPWA');
        if(installBtn) { installBtn.style.display = 'inline-block'; installBtn.addEventListener('click', () => { installBtn.style.display = 'none'; deferredPrompt.prompt(); deferredPrompt.userChoice.then((choiceResult) => { deferredPrompt = null; }); }); }
    });

    let stoperInterval; let czasSekundy = 0; const wyswietlacz = document.getElementById("wyswietlaczStopera");
    window.startStopera = function(sekundy) { 
        clearInterval(stoperInterval); czasSekundy = sekundy; wyswietlacz.innerText = `${Math.floor(czasSekundy / 60).toString().padStart(2, '0')}:${(czasSekundy % 60).toString().padStart(2, '0')}`; 
        stoperInterval = setInterval(() => { 
            czasSekundy--; wyswietlacz.innerText = `${Math.floor(czasSekundy / 60).toString().padStart(2, '0')}:${(czasSekundy % 60).toString().padStart(2, '0')}`; 
            if (czasSekundy <= 0) { clearInterval(stoperInterval); alert("⏰ Czas minął!"); } 
        }, 1000); 
    }
    document.querySelectorAll('.btn-timer-szybki').forEach(btn => btn.addEventListener('click', (e) => window.startStopera(parseInt(e.target.dataset.czas))));
    document.getElementById("btnStoperWlasny").addEventListener("click", () => { const wlasneMinuty = parseFloat(document.getElementById("stoperWlasnyCzas").value); if(wlasneMinuty > 0) { window.startStopera(wlasneMinuty * 60); document.getElementById("stoperWlasnyCzas").value = ""; } });
    document.getElementById("btnStoperStop").addEventListener("click", () => { clearInterval(stoperInterval); czasSekundy = 0; wyswietlacz.innerText = "00:00"; });

    // GENEROWANIE PDF
    document.getElementById("btnEksportPDF").addEventListener("click", () => {
        if(!czyPremium) { pokazEkran(document.getElementById("ekranPremium"), "Konto Premium 👑"); return; }
        const p = bazaProfili.find(x => x.id == aktywnyProfilId) || bazaProfili[0];
        let html = `<html><head><title>Raport Danych - Rodzicownik</title><style>body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; } h1 { color: #8b5cf6; border-bottom: 3px solid #8b5cf6; padding-bottom: 10px; } h2 { color: #3b82f6; margin-top: 30px; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; } .sekcja { margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; } ul { padding-left: 20px; } li { margin-bottom: 8px; font-size: 14px; } .stopka { margin-top: 50px; font-size: 12px; color: #94a3b8; text-align: center; }</style></head><body>`;
        html += `<h1>Raport Danych: Rodzicownik</h1><p>Wygenerowano w dniu: <strong>${new Date().toLocaleString()}</strong></p>`;
        html += `<div class="sekcja"><h2>👤 Profil Dziecka</h2><p><strong>Imię:</strong> ${p.imie || "Brak"}<br><strong>Waga:</strong> ${p.waga || "Brak"} kg<br><strong>Alergie:</strong> ${p.alergie || "Brak"}</p></div>`;
        html += `<div class="sekcja"><h2>💉 Kalendarz Szczepień</h2><ul>`; if(bazaSzczepien.length === 0) html += `<li>Brak wpisów</li>`; bazaSzczepien.forEach(s => { html += `<li><strong>${s.data}</strong>: ${s.nazwa}</li>`; }); html += `</ul></div>`;
        html += `<div class="sekcja"><h2>🍼 Historia Karmienia</h2><ul>`; if(bazaKarmienie.length === 0) html += `<li>Brak wpisów</li>`; bazaKarmienie.forEach(k => { html += `<li><strong>${k.data} ${k.czas}</strong>: ${k.typ} ${k.ilosc ? '('+k.ilosc+' ml)' : ''}</li>`; }); html += `</ul></div>`;
        html += `<div class="sekcja"><h2>📈 Bilans Rozwoju</h2><ul>`; if(bazaBilans.length === 0) html += `<li>Brak wpisów</li>`; bazaBilans.forEach(b => { html += `<li><strong>${b.data}</strong>: Waga: ${b.waga}kg, Wzrost: ${b.wzrost}cm, Głowa: ${b.glowa}cm</li>`; }); html += `</ul></div>`;
        html += `<div class="sekcja"><h2>🩺 Apteczka (Historia)</h2><ul>`; if(bazaZdarzen.length === 0) html += `<li>Brak wpisów</li>`; bazaZdarzen.forEach(m => { html += `<li><strong>${m.godzinaWyswietlana}</strong> - ${m.lek}: ${m.dawka}</li>`; }); html += `</ul></div>`;
        html += `<div class="sekcja"><h2>🏆 Sukcesy i Osiągnięcia</h2><ul>`; if(bazaOsiagniecia.length === 0) html += `<li>Brak wpisów</li>`; bazaOsiagniecia.forEach(o => { html += `<li><strong>${o.data}</strong>: ${o.nazwa}</li>`; }); html += `</ul></div>`;
        html += `<div class="sekcja"><h2>📝 Przypięte Notatki</h2><ul>`; if(bazaNotatek.length === 0) html += `<li>Brak wpisów</li>`; bazaNotatek.forEach(n => { html += `<li>${n.tekst}</li>`; }); html += `</ul></div>`;
        html += `<div class="sekcja"><h2>💰 Finanse (Historia)</h2><p><strong>Aktualne saldo:</strong> ${saldoFinansow.toFixed(2)} zł</p><ul>`; historiaFinansow.forEach(f => { html += `<li>${f.data} - ${f.opis}: <strong>${f.kwota} zł</strong></li>`; }); html += `</ul></div>`;
        html += `<div class="sekcja"><h2>📅 Zapisane Wydarzenia</h2><ul>`; if(bazaKalendarz.length === 0) html += `<li>Brak wpisów</li>`; bazaKalendarz.forEach(k => { html += `<li><strong>${k.data} ${k.czas}</strong>: ${k.tytul}</li>`; }); html += `</ul></div>`;
        html += `<div class="sekcja"><h2>💻 Cyfrowy Czas (Ekrany)</h2><ul>`; if(bazaEkrany.length === 0) html += `<li>Brak wpisów</li>`; bazaEkrany.forEach(e => { html += `<li><strong>${e.data} ${e.godzina}</strong>: ${e.urzadzenie} - ${e.akcja} ${e.czas ? '('+e.czas+' min)' : ''}</li>`; }); html += `</ul></div>`;
        html += `<div class="stopka">Wygenerowano z aplikacji Rodzicownik.</div></body></html>`;
        let printWindow = window.open('', '', 'width=800,height=800'); printWindow.document.write(html); printWindow.document.close(); printWindow.focus(); setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    });

    document.getElementById("btnExportZapas").addEventListener("click", () => {
        if(!czyPremium) return alert("Funkcja Kopii Zapasowej jest dostępna tylko w wersji Premium!");
        const dataToExport = JSON.stringify(localStorage);
        const blob = new Blob([dataToExport], { type: "application/json" });
        const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url;
        a.download = `Rodzicownik_Kopia_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    });
    document.getElementById("inputImportZapas").addEventListener("change", (e) => {
        if(!czyPremium) { e.target.value = ""; return alert("Funkcja Kopii Zapasowej jest dostępna tylko w wersji Premium!"); }
        const file = e.target.files[0]; if(!file) return;
        if(confirm("UWAGA! Wczytanie kopii zapasowej trwale nadpisze WSZYSTKIE obecne dane w aplikacji. Czy na pewno chcesz kontynuować?")) {
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const importedData = JSON.parse(event.target.result);
                    localStorage.clear();
                    Object.keys(importedData).forEach(key => { localStorage.setItem(key, importedData[key]); });
                    alert("✅ Kopia zapasowa została pomyślnie wczytana! Aplikacja zostanie zresetowana."); location.reload();
                } catch (error) { alert("❌ Wystąpił błąd podczas wczytywania. Upewnij się, że wybierasz poprawny plik .json."); }
            }; reader.readAsText(file);
        } else { e.target.value = ""; }
    });

    // ==========================================
    // MODUŁY ZAPISUJĄCE DO CHMURY
    // ==========================================
    function renderujWybierakProfili() {
        const sel = document.getElementById("wyborDziecka"); sel.innerHTML = "";
        bazaProfili.forEach(p => { const opt = document.createElement("option"); opt.value = p.id; opt.innerText = p.imie || "Dziecko"; if (p.id == aktywnyProfilId) opt.selected = true; sel.appendChild(opt); });
        wczytajAktywnyProfil();
    }
    function wczytajAktywnyProfil() {
        const p = bazaProfili.find(x => x.id == aktywnyProfilId) || bazaProfili[0];
        document.getElementById("imieDziecka").value = p.imie; document.getElementById("wagaDziecka").value = p.waga; document.getElementById("alergieDziecka").value = p.alergie;
        if(document.getElementById("mojPseudonimCzatu")) { document.getElementById("mojPseudonimCzatu").innerText = `Rodzic ${p.imie || "Dziecka"}`; }
        zapiszWChmurze("medProfil", {imie: p.imie, waga: p.waga, alergie: p.alergie});
    }

    document.getElementById("wyborDziecka").addEventListener("change", (e) => { aktywnyProfilId = e.target.value; zapiszWChmurze("medAktywnyProfilId", aktywnyProfilId); wczytajAktywnyProfil(); });
    document.getElementById("btnDodajDziecko").addEventListener("click", () => {
        if(!czyPremium) { if(confirm("Dodawanie kolejnych profili to funkcja Premium. Czy chcesz ją odblokować?")) { pokazEkran(document.getElementById("ekranPremium"), "Konto Premium 👑"); } return; }
        const noweImie = prompt("Podaj imię kolejnego dziecka:");
        if (noweImie) {
            const nowyProfil = { id: Date.now(), imie: noweImie, waga: "", alergie: "" }; bazaProfili.push(nowyProfil); zapiszWChmurze("medBazaProfili", bazaProfili);
            aktywnyProfilId = nowyProfil.id; zapiszWChmurze("medAktywnyProfilId", aktywnyProfilId); renderujWybierakProfili(); alert(`Dodano profil: ${noweImie}! Wpisz teraz jego wagę.`);
        }
    });

    document.getElementById("btnZapiszProfil").addEventListener("click", () => { 
        let p = bazaProfili.find(x => x.id == aktywnyProfilId); p.imie = document.getElementById("imieDziecka").value; p.waga = document.getElementById("wagaDziecka").value; p.alergie = document.getElementById("alergieDziecka").value; 
        zapiszWChmurze("medBazaProfili", bazaProfili); renderujWybierakProfili(); alert("✅ Zapisano dane profilu!"); 
    });

    document.getElementById("btnZapiszPin").addEventListener("click", () => { 
        const stary = document.getElementById("inputStaryPin").value; const nowy = document.getElementById("inputNowyPin").value.trim(); 
        if (stary !== aktualnyPin) { return alert("❌ Błędny obecny kod PIN!"); }
        if (nowy === "") { return alert("❌ Nowy PIN nie może być pusty!"); }
        aktualnyPin = nowy; zapiszWChmurze("rodzicPin", aktualnyPin); 
        document.getElementById("inputStaryPin").value = ""; document.getElementById("inputNowyPin").value = ""; alert("✅ PIN został pomyślnie zmieniony!"); 
    });

    document.getElementById("btnWyjscieDziecko").addEventListener("click", () => { const p = aktualnyPin === "1234" ? " (Domyślny: 1234)" : ""; if (prompt(`Podaj PIN rodzica${p}:`) === aktualnyPin) { btnNavStart.click(); } else { alert("Błędny PIN!"); } });

    function renderujKarmienie() { const lista = document.getElementById("listaKarmienie"); lista.innerHTML = ""; bazaKarmienie.forEach(k => { const li = document.createElement("li"); li.className = "notatka-element"; li.innerHTML = `<div class="notatka-tekst"><strong style="color:#ad1457;">${k.data} ${k.czas}</strong><br>${k.typ} ${k.ilosc ? `(${k.ilosc} ml)` : ''}</div><button class="btn-usun" style="margin-left: 10px;">🗑️</button>`; li.querySelector('.btn-usun').addEventListener('click', () => { bazaKarmienie = bazaKarmienie.filter(x => x.id !== k.id); zapiszWChmurze("narzedziaKarmienie", bazaKarmienie); renderujKarmienie(); }); lista.appendChild(li); }); }
    document.getElementById("btnDodajKarmienie").addEventListener("click", () => { const t = document.getElementById("noweKarmienieTyp").value; const i = document.getElementById("noweKarmienieIlosc").value; const d = document.getElementById("noweKarmienieData").value; const c = document.getElementById("noweKarmienieCzas").value; if(!d || !c) return; bazaKarmienie.unshift({ id: Date.now(), typ: t, ilosc: i, data: d, czas: c }); zapiszWChmurze("narzedziaKarmienie", bazaKarmienie); document.getElementById("noweKarmienieIlosc").value = ""; renderujKarmienie(); }); 

    function renderujBilans() { const lista = document.getElementById("listaBilans"); lista.innerHTML = ""; bazaBilans.forEach(b => { const li = document.createElement("li"); li.className = "notatka-element"; li.innerHTML = `<div class="notatka-tekst"><strong style="color:#283593;">${b.data}</strong><br>Waga: ${b.waga} kg | Wzrost: ${b.wzrost} cm | Głowa: ${b.glowa} cm</div><button class="btn-usun" style="margin-left: 10px;">🗑️</button>`; li.querySelector('.btn-usun').addEventListener('click', () => { bazaBilans = bazaBilans.filter(x => x.id !== b.id); zapiszWChmurze("narzedziaBilans", bazaBilans); renderujBilans(); }); lista.appendChild(li); }); }
    document.getElementById("btnDodajBilans").addEventListener("click", () => { const d = document.getElementById("nowyBilansData").value; const w = document.getElementById("nowyBilansWaga").value; const wz = document.getElementById("nowyBilansWzrost").value; const g = document.getElementById("nowyBilansGlowa").value; if(!d) return; bazaBilans.unshift({ id: Date.now(), data: d, waga: w||'-', wzrost: wz||'-', glowa: g||'-' }); zapiszWChmurze("narzedziaBilans", bazaBilans); if(w) { let p = bazaProfili.find(x => x.id == aktywnyProfilId); if(p) { p.waga = w; zapiszWChmurze("medBazaProfili", bazaProfili); renderujWybierakProfili(); } } document.getElementById("nowyBilansWaga").value = ""; document.getElementById("nowyBilansWzrost").value = ""; document.getElementById("nowyBilansGlowa").value = ""; renderujBilans(); }); 

    function renderujSzczepienia() { const lista = document.getElementById("listaSzczepien"); lista.innerHTML = ""; bazaSzczepien.forEach(s => { const li = document.createElement("li"); li.className = "notatka-element"; li.innerHTML = `<div class="notatka-tekst"><strong style="color:#00acc1;">${s.data}</strong><br>${s.nazwa}</div><button class="btn-usun" style="margin-left: 10px;">🗑️</button>`; li.querySelector('.btn-usun').addEventListener('click', () => { bazaSzczepien = bazaSzczepien.filter(x => x.id !== s.id); zapiszWChmurze("narzedziaSzczepienia", bazaSzczepien); renderujSzczepienia(); }); lista.appendChild(li); }); }
    document.getElementById("btnDodajSzczepienie").addEventListener("click", () => { const d = document.getElementById("noweSzczepienieData").value; const n = document.getElementById("noweSzczepienieNazwa").value.trim(); if(!d || !n) return; bazaSzczepien.push({ id: Date.now(), data: d, nazwa: n }); bazaSzczepien.sort((a,b) => new Date(b.data) - new Date(a.data)); zapiszWChmurze("narzedziaSzczepienia", bazaSzczepien); document.getElementById("noweSzczepienieNazwa").value = ""; renderujSzczepienia(); });

    const typLekuSelect = document.getElementById("typLeku"); const wartoscInput = document.getElementById("wartosc"); const panelNowegoLeku = document.getElementById("panelNowegoLeku"); const infoDawka = document.getElementById("infoDawka");
    function odswiezLeki() { typLekuSelect.innerHTML = `<option value="Ibuprofen">💊 Ibuprofen</option><option value="Paracetamol">💊 Paracetamol</option>`; mojaApteczka.forEach(l => { const o = document.createElement("option"); o.value = l; o.innerText = "💊 " + l; typLekuSelect.appendChild(o); }); typLekuSelect.innerHTML += `<option value="DodajNowy">➕ Dodaj nowy...</option><option value="Temperatura">🌡️ Temperatura</option>`; }
    typLekuSelect.addEventListener("change", (e) => { infoDawka.classList.add("ukryty"); if(e.target.value === "DodajNowy") { panelNowegoLeku.classList.remove("ukryty"); document.getElementById("btnKalkulator").classList.add("ukryty"); } else { panelNowegoLeku.classList.add("ukryty"); document.getElementById("btnKalkulator").classList.remove("ukryty"); } if(e.target.value === "Temperatura") { wartoscInput.placeholder = "Wynik °C"; document.getElementById("btnKalkulator").classList.add("ukryty"); } else { wartoscInput.placeholder = "Dawka (ml)"; } });
    document.getElementById("btnZapiszNowyLek").addEventListener("click", () => { const n = document.getElementById("nowaNazwaLeku").value.trim(); if(n){ mojaApteczka.push(n); zapiszWChmurze("medApteczka", mojaApteczka); odswiezLeki(); typLekuSelect.value = n; panelNowegoLeku.classList.add("ukryty"); } });
    function odswiezZdarzenia() { const l = document.getElementById("listaZdarzen"); l.innerHTML = ""; bazaZdarzen.forEach(z => { const li = document.createElement("li"); li.className = z.typ === "Temperatura" ? "wpis-temp" : "wpis-lek"; li.innerHTML = `<strong>${z.godzinaWyswietlana}</strong> - ${z.lek}: <strong>${z.dawka}</strong>`; l.appendChild(li); }); } 
    document.getElementById("btnZapiszLek").addEventListener("click", () => { const t = typLekuSelect.value; const txt = typLekuSelect.options[typLekuSelect.selectedIndex].text; const w = wartoscInput.value; if(t!=="DodajNowy" && w) { const d = new Date(); bazaZdarzen.unshift({ typ: t, lek: txt, dawka: w, czasWpisu: d.getTime(), godzinaWyswietlana: d.getHours().toString().padStart(2,'0')+":"+d.getMinutes().toString().padStart(2,'0') }); zapiszWChmurze("medHistoria", bazaZdarzen); wartoscInput.value=""; infoDawka.classList.add("ukryty"); odswiezZdarzenia(); } });
    document.getElementById("btnKalkulator").addEventListener("click", () => { const p = bazaProfili.find(x => x.id == aktywnyProfilId) || bazaProfili[0]; if(!p || !p.waga || p.waga <= 0) return alert("Brak wagi! Uzupełnij ją w 'Profilu' lub dodaj w 'Bilansie'."); const waga = parseFloat(p.waga); const typ = typLekuSelect.value; let dawka = 0; let opisStężenia = ""; if(typ === "Ibuprofen") { dawka = waga / 4; opisStężenia = "Syrop FORTE (40mg/ml). Podawać co 6-8h."; } else if (typ === "Paracetamol") { dawka = (waga * 15) / 24; opisStężenia = "Syrop (120mg/5ml). Podawać co 4-6h."; } else { return alert("Kalkulator działa tylko dla Ibuprofenu i Paracetamolu."); } const wynik = Math.round(dawka * 10) / 10; wartoscInput.value = wynik; infoDawka.innerHTML = `✨ Sugerowana <strong>JEDNORAZOWA</strong> dawka dla ${waga}kg:<br><span style="font-size: 20px; font-weight: 900; color: #1e40af; display: block; margin: 5px 0;">${wynik} ml</span><span style="font-size: 11px; color: #475569;">Ważne: ${opisStężenia}</span>`; infoDawka.classList.remove("ukryty"); });
    document.getElementById("notatkiLekarz").value = localStorage.getItem("medNotatki") || ""; document.getElementById("notatkiLekarz").addEventListener("input", (e) => zapiszWChmurze("medNotatki", e.target.value));
    document.getElementById("btnWyczysc").addEventListener("click", () => { if(confirm("Wyczyścić historię leków?")){ usunZChmury("medHistoria"); bazaZdarzen=[]; document.getElementById("notatkiLekarz").value=""; odswiezZdarzenia(); }});

    function aktualizujKonto() { const s = saldoFinansow.toFixed(2); document.getElementById("sumaFinanse").innerText = s; document.getElementById("sumaFinanseDziecko").innerText = s; zapiszWChmurze("grySaldo", saldoFinansow); }
    function renderujTransakcje() { const l = document.getElementById("listaTransakcji"); l.innerHTML = ""; historiaFinansow.forEach(tr => { const li = document.createElement("li"); const p = tr.kwota > 0; li.innerHTML = `<strong>${tr.data}</strong> - ${tr.opis}: <span class="${p ? "transakcja-plus" : "transakcja-minus"}">${p ? "+" : ""}${tr.kwota.toFixed(2)} zł</span>`; li.style.borderLeftColor = p ? "#10b981" : "#ef4444"; l.appendChild(li); }); }
    document.getElementById("btnWplata").addEventListener("click", () => dodajTrans(true)); document.getElementById("btnWydatek").addEventListener("click", () => dodajTrans(false));
    function dodajTrans(czyW) { const o = document.getElementById("opisTransakcji").value.trim(); const k = parseFloat(document.getElementById("kwotaTransakcji").value); if (o === "" || isNaN(k) || k <= 0) return alert("Błąd!"); const kOst = czyW ? k : -k; const d = new Date(); const dStr = d.getDate().toString().padStart(2,'0')+"."+(d.getMonth()+1).toString().padStart(2,'0')+" "+d.getHours().toString().padStart(2,'0')+":"+d.getMinutes().toString().padStart(2,'0'); historiaFinansow.unshift({ opis: o, kwota: kOst, data: dStr }); saldoFinansow += kOst; zapiszWChmurze("gryHistoriaFinansow", historiaFinansow); document.getElementById("opisTransakcji").value=""; document.getElementById("kwotaTransakcji").value=""; aktualizujKonto(); renderujTransakcje(); }

    function renderujNotatki() { const lista = document.getElementById("listaNotatek"); lista.innerHTML = ""; bazaNotatek.forEach(n => { const li = document.createElement("li"); li.className = "notatka-element"; li.innerHTML = `<div class="notatka-tekst">${n.tekst}</div><button class="btn-usun" style="margin-left: 10px; margin-top: -5px;">🗑️</button>`; li.querySelector('.btn-usun').addEventListener('click', () => { bazaNotatek = bazaNotatek.filter(x => x.id !== n.id); zapiszWChmurze("narzedziaNotatki", bazaNotatek); renderujNotatki(); }); lista.appendChild(li); }); }
    document.getElementById("btnDodajNotatke").addEventListener("click", () => { const t = document.getElementById("nowaNotatkaTekst").value.trim(); if (!t) return; bazaNotatek.unshift({ id: Date.now(), tekst: t }); zapiszWChmurze("narzedziaNotatki", bazaNotatek); document.getElementById("nowaNotatkaTekst").value = ""; renderujNotatki(); }); 

    function renderujKalendarz() { 
        const lista = document.getElementById("listaWydarzen"); lista.innerHTML = ""; 
        bazaKalendarz.sort((a, b) => new Date(a.dataPełna) - new Date(b.dataPełna)); 
        bazaKalendarz.forEach(wyd => { 
            const li = document.createElement("li"); li.className = "wydarzenie-element"; 
            const dataObj = new Date(wyd.dataPełna); const miesiace = ["STY", "LUT", "MAR", "KWI", "MAJ", "CZE", "LIP", "SIE", "WRZ", "PAŹ", "LIS", "GRU"]; 
            
            li.style.borderLeft = `5px solid ${wyd.kolor || '#3b82f6'}`;
            let etykiety = "";
            if(wyd.kategoria || wyd.priorytet || wyd.cykl || wyd.przypomnienie || wyd.osoba) {
                etykiety = `<div style="margin-top:5px; font-size:11px; display:flex; flex-wrap:wrap; gap:4px;">
                    ${wyd.kategoria ? `<span style="background:#e2e8f0; padding:2px 6px; border-radius:4px;">${wyd.kategoria}</span>` : ''}
                    ${wyd.priorytet ? `<span style="background:#fef3c7; color:#b45309; padding:2px 6px; border-radius:4px; font-weight:bold;">${wyd.priorytet}</span>` : ''}
                    ${wyd.cykl ? `<span style="background:#dbeafe; color:#1e40af; padding:2px 6px; border-radius:4px;">${wyd.cykl}</span>` : ''}
                    ${wyd.przypomnienie ? `<span style="background:#fee2e2; color:#b91c1c; padding:2px 6px; border-radius:4px;">${wyd.przypomnienie}</span>` : ''}
                    ${wyd.osoba ? `<span style="background:#f3e8ff; color:#6b21a8; padding:2px 6px; border-radius:4px;">${wyd.osoba}</span>` : ''}
                </div>`;
            }
            li.innerHTML = `<div class="wydarzenie-data"><small>${miesiace[dataObj.getMonth()]}</small><span>${dataObj.getDate().toString().padStart(2, '0')}</span></div><div class="wydarzenie-info"><span class="wydarzenie-tytul">${wyd.tytul}</span><span class="wydarzenie-czas">🕒 ${wyd.czas || "Cały dzień"}</span>${etykiety}${wyd.opis ? `<div style="font-size:12px; color:#64748b; margin-top:3px; font-style:italic;">${wyd.opis}</div>` : ''}</div><button class="btn-usun" style="font-size: 20px;">🗑️</button>`; 
            li.querySelector('.btn-usun').addEventListener('click', () => { bazaKalendarz = bazaKalendarz.filter(w => w.id !== wyd.id); zapiszWChmurze("narzedziaKalendarz", bazaKalendarz); renderujKalendarz(); }); 
            lista.appendChild(li); 
        }); 
    }
    document.getElementById("btnDodajWydarzenie").addEventListener("click", () => { 
        const tytul = document.getElementById("noweWydarzenieTytul").value.trim(); const data = document.getElementById("noweWydarzenieData").value; const czas = document.getElementById("noweWydarzenieCzas").value; 
        if (!tytul || !data) return alert("Podaj tytuł i datę!"); 
        bazaKalendarz.push({ id: Date.now(), tytul, data, czas, dataPełna: czas ? `${data}T${czas}` : `${data}T00:00` }); 
        zapiszWChmurze("narzedziaKalendarz", bazaKalendarz); document.getElementById("noweWydarzenieTytul").value = ""; renderujKalendarz(); 
    }); 
    document.getElementById("btnDodajWydarzeniePremium").addEventListener("click", () => { 
        const tytul = document.getElementById("noweWydarzenieTytulPremium").value.trim(); const kategoria = document.getElementById("noweWydarzenieKategoria").value; const priorytet = document.getElementById("noweWydarzeniePriorytet").value; const data = document.getElementById("noweWydarzenieDataPremium").value; const czas = document.getElementById("noweWydarzenieCzasPremium").value; const opis = document.getElementById("noweWydarzenieOpis").value.trim();
        const cykl = document.getElementById("noweWydarzenieCykl").value; const przypomnienie = document.getElementById("noweWydarzeniePrzypomnienie").value; const osoba = document.getElementById("noweWydarzenieOsoba").value; const kolor = document.getElementById("noweWydarzenieKolor").value;
        if (!tytul || !data) return alert("Podaj tytuł i datę wydarzenia!"); 
        bazaKalendarz.push({ id: Date.now(), tytul, data, czas, dataPełna: czas ? `${data}T${czas}` : `${data}T00:00`, kategoria, priorytet, opis, cykl, przypomnienie, osoba, kolor }); 
        zapiszWChmurze("narzedziaKalendarz", bazaKalendarz); document.getElementById("noweWydarzenieTytulPremium").value = ""; document.getElementById("noweWydarzenieOpis").value = ""; renderujKalendarz(); 
    }); 

    const dniWaga = {"Poniedziałek":1, "Wtorek":2, "Środa":3, "Czwartek":4, "Piątek":5, "Sobota":6, "Niedziela":7};
    function renderujPlan() { const lista = document.getElementById("listaPlan"); lista.innerHTML = ""; bazaPlan.sort((a,b) => (dniWaga[a.dzien] - dniWaga[b.dzien]) || a.czas.localeCompare(b.czas)); bazaPlan.forEach(p => { const li = document.createElement("li"); li.className = "plan-element"; li.innerHTML = `<div class="notatka-tekst"><span class="plan-dzien">${p.dzien}</span><strong>${p.czas}</strong> - ${p.nazwa}</div><button class="btn-usun">🗑️</button>`; li.querySelector('.btn-usun').addEventListener('click', () => { bazaPlan = bazaPlan.filter(x => x.id !== p.id); zapiszWChmurze("narzedziaPlan", bazaPlan); renderujPlan(); }); lista.appendChild(li); }); }
    document.getElementById("btnDodajPlan").addEventListener("click", () => { const d = document.getElementById("nowyPlanDzien").value; const c = document.getElementById("nowyPlanCzas").value; const n = document.getElementById("nowyPlanNazwa").value.trim(); if(!c || !n) return; bazaPlan.push({id: Date.now(), dzien: d, czas: c, nazwa: n}); zapiszWChmurze("narzedziaPlan", bazaPlan); document.getElementById("nowyPlanNazwa").value=""; document.getElementById("nowyPlanCzas").value=""; renderujPlan(); }); 

    const typWaga = {"Śniadanie":1, "Obiad":2, "Kolacja":3, "Przekąska":4};
    function renderujPosilki() { const lista = document.getElementById("listaPosilki"); lista.innerHTML = ""; bazaPosilki.sort((a,b) => (dniWaga[a.dzien] - dniWaga[b.dzien]) || (typWaga[a.typ] - typWaga[b.typ])); bazaPosilki.forEach(p => { const li = document.createElement("li"); li.className = "posilek-element"; li.innerHTML = `<div class="notatka-tekst"><span class="posilek-dzien">${p.dzien}</span><strong>${p.typ}</strong>: ${p.nazwa}</div><button class="btn-usun">🗑️</button>`; li.querySelector('.btn-usun').addEventListener('click', () => { bazaPosilki = bazaPosilki.filter(x => x.id !== p.id); zapiszWChmurze("narzedziaPosilki", bazaPosilki); renderujPosilki(); }); lista.appendChild(li); }); }
    document.getElementById("btnDodajPosilek").addEventListener("click", () => { const d = document.getElementById("nowyPosilekDzien").value; const t = document.getElementById("nowyPosilekTyp").value; const n = document.getElementById("nowyPosilekNazwa").value.trim(); if(!n) return; bazaPosilki.push({id: Date.now(), dzien: d, typ: t, nazwa: n}); zapiszWChmurze("narzedziaPosilki", bazaPosilki); document.getElementById("nowyPosilekNazwa").value=""; renderujPosilki(); }); 

    function renderujEkrany() { const lista = document.getElementById("listaEkrany"); lista.innerHTML = ""; bazaEkrany.forEach(e => { const li = document.createElement("li"); li.className = "notatka-element"; li.innerHTML = `<div class="notatka-tekst"><strong style="color:#475569;">${e.data} o ${e.godzina}</strong><br>${e.akcja}: <strong style="color:#3b82f6;">${e.urzadzenie}</strong> ${e.czas ? `<br><span style="color:#10b981; font-size:12px;">Zadeklarowano: ${e.czas} min</span>` : ''}</div><button class="btn-usun" style="margin-left: 10px;">🗑️</button>`; li.querySelector('.btn-usun').addEventListener('click', () => { bazaEkrany = bazaEkrany.filter(x => x.id !== e.id); zapiszWChmurze("narzedziaEkrany", bazaEkrany); renderujEkrany(); }); lista.appendChild(li); }); }
    document.getElementById("btnDodajEkran").addEventListener("click", () => { const u = document.getElementById("nowyEkranUrzadzenie").value; const a = document.getElementById("nowyEkranAkcja").value; const c = document.getElementById("nowyEkranCzas").value; const d = new Date(); const dStr = d.getDate().toString().padStart(2,'0') + "." + (d.getMonth()+1).toString().padStart(2,'0') + "." + d.getFullYear(); const tStr = d.getHours().toString().padStart(2,'0')+":"+d.getMinutes().toString().padStart(2,'0'); bazaEkrany.unshift({ id: Date.now(), urzadzenie: u, akcja: a, czas: c, data: dStr, godzina: tStr }); zapiszWChmurze("narzedziaEkrany", bazaEkrany); document.getElementById("nowyEkranCzas").value = ""; if(a.includes("Zdał sprzęt")) { alert("Świetnie! Dziecko zdało sprzęt. W nagrodę możesz dodać mu punkty w module Punkty ⭐!"); } renderujEkrany(); });

    let aktualnyZalacznikSejf = ""; const plikInput = document.getElementById("nowySejfPlik"); const podgladTekst = document.getElementById("podgladSejfPliku");
    if(plikInput) { plikInput.addEventListener("change", function(e) { const file = e.target.files[0]; if (!file) return; podgladTekst.innerText = "⏳ Optymalizacja zdjęcia..."; const reader = new FileReader(); reader.onload = function(event) { const img = new Image(); img.onload = function() { const canvas = document.createElement("canvas"); const MAX_WIDTH = 600; let scaleSize = 1; if (img.width > MAX_WIDTH) { scaleSize = MAX_WIDTH / img.width; } canvas.width = img.width * scaleSize; canvas.height = img.height * scaleSize; const ctx = canvas.getContext("2d"); ctx.drawImage(img, 0, 0, canvas.width, canvas.height); aktualnyZalacznikSejf = canvas.toDataURL("image/jpeg", 0.7); podgladTekst.innerText = "✅ Skan gotowy do zabezpieczenia!"; }; img.src = event.target.result; }; reader.readAsDataURL(file); }); }
    function renderujSejf() { const lista = document.getElementById("listaSejf"); lista.innerHTML = ""; bazaSejf.forEach(s => { const li = document.createElement("li"); li.className = "sejf-element"; let imgHtml = ""; if (s.zdjecie) { imgHtml = `<div style="margin-top:10px;"><img src="${s.zdjecie}" style="max-width: 100%; border-radius: 8px; border: 1px solid #cbd5e1; cursor: zoom-in;" onclick="window.open(this.src)" alt="Skan dokumentu"></div>`; } li.innerHTML = `<div style="flex-grow: 1; margin-right: 15px;"><strong style="color:#1e293b;">${s.nazwa}</strong>${s.wartosc ? `<span class="sejf-wartosc">${s.wartosc}</span>` : ''}${imgHtml}</div><button class="btn-usun" style="flex-shrink: 0;">🗑️</button>`; li.querySelector('.btn-usun').addEventListener('click', () => { bazaSejf = bazaSejf.filter(x => x.id !== s.id); zapiszWChmurze("narzedziaSejf", bazaSejf); renderujSejf(); }); lista.appendChild(li); }); }
    document.getElementById("btnDodajSejf").addEventListener("click", () => { const n = document.getElementById("nowySejfKategoria").value; const w = document.getElementById("nowySejfWartosc").value.trim(); if(!w && !aktualnyZalacznikSejf) { return alert("Wpisz wartość lub dodaj zdjęcie dokumentu!"); } bazaSejf.unshift({ id: Date.now(), nazwa: n, wartosc: w, zdjecie: aktualnyZalacznikSejf }); zapiszWChmurze("narzedziaSejf", bazaSejf); document.getElementById("nowySejfWartosc").value = ""; document.getElementById("nowySejfPlik").value = ""; aktualnyZalacznikSejf = ""; podgladTekst.innerText = ""; renderujSejf(); }); 

    function renderujRozmiary() { const lista = document.getElementById("listaRozmiarow"); lista.innerHTML = ""; bazaRozmiary.forEach(r => { const li = document.createElement("li"); li.className = "rozmiar-element"; li.innerHTML = `<div><div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">Zaktualizowano: ${r.data}</div><div class="rozmiar-detale">${r.wzrost ? `<span>Wzrost: ${r.wzrost}cm</span>` : ''}${r.ubranie ? `<span>Ubranie: ${r.ubranie}</span>` : ''}${r.but ? `<span>But: ${r.but}</span>` : ''}</div></div><button class="btn-usun">🗑️</button>`; li.querySelector('.btn-usun').addEventListener('click', () => { bazaRozmiary = bazaRozmiary.filter(x => x.id !== r.id); zapiszWChmurze("narzedziaRozmiary", bazaRozmiary); renderujRozmiary(); }); lista.appendChild(li); }); }
    document.getElementById("btnDodajRozmiar").addEventListener("click", () => { const w = document.getElementById("nowyRozmiarWzrost").value; const u = document.getElementById("nowyRozmiarUbranie").value; const b = document.getElementById("nowyRozmiarBut").value; if(!w && !u && !b) return alert("Podaj chociaż jeden rozmiar!"); const d = new Date(); const dataStr = d.getDate().toString().padStart(2,'0') + "." + (d.getMonth()+1).toString().padStart(2,'0') + "." + d.getFullYear(); bazaRozmiary.unshift({ id: Date.now(), wzrost: w, ubranie: u, but: b, data: dataStr }); zapiszWChmurze("narzedziaRozmiary", bazaRozmiary); document.getElementById("nowyRozmiarWzrost").value=""; document.getElementById("nowyRozmiarUbranie").value=""; document.getElementById("nowyRozmiarBut").value=""; renderujRozmiary(); }); 

    function renderujCytaty() { const lista = document.getElementById("listaCytatow"); lista.innerHTML = ""; bazaCytaty.forEach(c => { const li = document.createElement("li"); li.className = "cytat-element"; li.innerHTML = `<div class="notatka-tekst" style="font-style: italic;">"${c.tekst}"</div><button class="btn-usun" style="margin-left: 10px; margin-top: -5px;">🗑️</button>`; li.querySelector('.btn-usun').addEventListener('click', () => { bazaCytaty = bazaCytaty.filter(x => x.id !== c.id); zapiszWChmurze("narzedziaCytaty", bazaCytaty); renderujCytaty(); }); lista.appendChild(li); }); }
    document.getElementById("btnDodajCytat").addEventListener("click", () => { const t = document.getElementById("nowyCytatTekst").value.trim(); if (!t) return; bazaCytaty.unshift({ id: Date.now(), tekst: t }); zapiszWChmurze("narzedziaCytaty", bazaCytaty); document.getElementById("nowyCytatTekst").value = ""; renderujCytaty(); }); 

    function renderujKontakty() { const lista = document.getElementById("listaKontaktow"); lista.innerHTML = ""; bazaKontaktow.forEach(k => { const li = document.createElement("li"); li.className = "kontakt-element"; li.innerHTML = `<div class="notatka-tekst"><strong style="color:#1e293b;">${k.nazwa}</strong><br><span style="color:#3b82f6;">${k.numer}</span></div><button class="btn-usun" style="margin-left: 10px;">🗑️</button>`; li.querySelector('.btn-usun').addEventListener('click', () => { bazaKontaktow = bazaKontaktow.filter(x => x.id !== k.id); zapiszWChmurze("narzedziaKontakty", bazaKontaktow); renderujKontakty(); }); lista.appendChild(li); }); }
    document.getElementById("btnDodajKontakt").addEventListener("click", () => { const n = document.getElementById("nowyKontaktNazwa").value.trim(); const num = document.getElementById("nowyKontaktNumer").value.trim(); if (!n || !num) return; bazaKontaktow.push({ id: Date.now(), nazwa: n, numer: num }); zapiszWChmurze("narzedziaKontakty", bazaKontaktow); document.getElementById("nowyKontaktNazwa").value = ""; document.getElementById("nowyKontaktNumer").value = ""; renderujKontakty(); }); 

    function renderujPakowanie() { const lista = document.getElementById("listaPakowanie"); lista.innerHTML = ""; bazaPakowanie.forEach(p => { const li = document.createElement("li"); li.className = `pakowanie-element ${p.zrobione ? 'pakowanie-zrobione' : ''}`; li.innerHTML = `<div class="pakowanie-checkbox">✓</div><div class="pakowanie-tekst">${p.nazwa}</div><button class="btn-usun" style="margin-left: 10px; flex-shrink:0;">🗑️</button>`; li.addEventListener('click', (e) => { if(!e.target.classList.contains('btn-usun')) { p.zrobione = !p.zrobione; zapiszWChmurze("narzedziaPakowanie", bazaPakowanie); renderujPakowanie(); } }); li.querySelector('.btn-usun').addEventListener('click', (e) => { e.stopPropagation(); bazaPakowanie = bazaPakowanie.filter(x => x.id !== p.id); zapiszWChmurze("narzedziaPakowanie", bazaPakowanie); renderujPakowanie(); }); lista.appendChild(li); }); }
    document.getElementById("btnDodajRzeczPakowanie").addEventListener("click", () => { const n = document.getElementById("nowaRzeczPakowanie").value.trim(); if(!n) return; bazaPakowanie.unshift({id: Date.now(), nazwa: n, zrobione: false}); zapiszWChmurze("narzedziaPakowanie", bazaPakowanie); document.getElementById("nowaRzeczPakowanie").value=""; renderujPakowanie(); });
    document.getElementById("btnWyczyscPakowanie").addEventListener("click", () => { bazaPakowanie.forEach(p => p.zrobione = false); zapiszWChmurze("narzedziaPakowanie", bazaPakowanie); renderujPakowanie(); }); 

    function renderujOsiagniecia() { const lista = document.getElementById("listaOsiagniecia"); lista.innerHTML = ""; bazaOsiagniecia.sort((a,b) => new Date(b.data) - new Date(a.data)); bazaOsiagniecia.forEach(o => { const li = document.createElement("li"); li.className = "osiagniecie-element"; const dataObj = new Date(o.data); const dStr = dataObj.getDate().toString().padStart(2,'0')+"."+(dataObj.getMonth()+1).toString().padStart(2,'0')+"."+dataObj.getFullYear(); li.innerHTML = `<div class="osiagniecie-ikona">🌟</div><div class="osiagniecie-info"><span class="osiagniecie-tytul">${o.nazwa}</span><span class="osiagniecie-data">${dStr}</span></div><button class="btn-usun" style="position:relative; z-index:5;">🗑️</button>`; li.querySelector('.btn-usun').addEventListener('click', () => { bazaOsiagniecia = bazaOsiagniecia.filter(x => x.id !== o.id); zapiszWChmurze("narzedziaOsiagniecia", bazaOsiagniecia); renderujOsiagniecia(); }); lista.appendChild(li); }); }
    document.getElementById("btnDodajSukces").addEventListener("click", () => { const n = document.getElementById("nowySukcesNazwa").value.trim(); const d = document.getElementById("nowySukcesData").value; if(!n || !d) return; bazaOsiagniecia.push({id: Date.now(), nazwa: n, data: d}); zapiszWChmurze("narzedziaOsiagniecia", bazaOsiagniecia); document.getElementById("nowySukcesNazwa").value=""; document.getElementById("nowySukcesData").value=""; renderujOsiagniecia(); }); 

    function aktualizujPortfel() { document.getElementById("sumaPunktow").innerText = mojePunkty; document.getElementById("sumaPunktowDziecko").innerText = mojePunkty; zapiszWChmurze("gryPunkty", mojePunkty); }
    function renderujOczekujace() { const s = document.getElementById("sekcjaOczekujace"); const l = document.getElementById("listaOczekujacych"); if (oczekujaceZadania.length === 0) { s.style.display = "none"; } else { s.style.display = "block"; l.innerHTML = ""; oczekujaceZadania.forEach(ocz => { const li = document.createElement("li"); li.style.borderLeftColor = "#f59e0b"; li.innerHTML = `<div class="akcja-info"><span class="akcja-nazwa">${ocz.nazwa}</span><span class="akcja-punkty" style="color:#f59e0b; background:#fef3c7;">+${ocz.punkty} ⭐</span></div><div style="display:flex; gap:5px;"><button class="btn-wykonaj" style="background-color:#f59e0b;">✔️</button><button class="btn-usun">❌</button></div>`; li.querySelector('.btn-wykonaj').addEventListener('click', () => { mojePunkty += ocz.punkty; aktualizujPortfel(); usunZOczekujacych(ocz.id); alert(`Zatwierdzono! +${ocz.punkty} ⭐`); }); li.querySelector('.btn-usun').addEventListener('click', () => { usunZOczekujacych(ocz.id); }); l.appendChild(li); }); } }
    function usunZOczekujacych(id) { oczekujaceZadania = oczekujaceZadania.filter(o => o.id !== id); zapiszWChmurze("gryOczekujace", oczekujaceZadania); renderujOczekujace(); }
    function renderujZadania() { document.getElementById("listaZadan").innerHTML = ""; bazaZadan.forEach(z => { const li = document.createElement("li"); li.innerHTML = `<div class="akcja-info"><span class="akcja-nazwa">${z.nazwa}</span><span class="akcja-punkty">+${z.punkty} ⭐</span></div><div style="display:flex; gap:5px;"><button class="btn-wykonaj">✅</button><button class="btn-usun">🗑️</button></div>`; li.querySelector('.btn-wykonaj').addEventListener('click', () => { mojePunkty += z.punkty; aktualizujPortfel(); alert(`Dodano ${z.punkty} ⭐!`); }); li.querySelector('.btn-usun').addEventListener('click', () => { bazaZadan = bazaZadan.filter(x => x.id !== z.id); zapiszWChmurze("gryZadania", bazaZadan); renderujZadania(); renderujWidokDziecka(); }); document.getElementById("listaZadan").appendChild(li); }); }
    function renderujNagrody() { document.getElementById("listaNagrod").innerHTML = ""; bazaNagrod.forEach(n => { const li = document.createElement("li"); li.innerHTML = `<div class="akcja-info"><span class="akcja-nazwa">${n.nazwa}</span><span class="akcja-punkty akcja-koszt">-${n.koszt} ⭐</span></div><div><button class="btn-usun">🗑️</button></div>`; li.querySelector('.btn-usun').addEventListener('click', () => { bazaNagrod = bazaNagrod.filter(x => x.id !== n.id); zapiszWChmurze("gryNagrody", bazaNagrod); renderujNagrody(); renderujWidokDziecka(); }); document.getElementById("listaNagrod").appendChild(li); }); }
    function renderujWidokDziecka() { aktualizujPortfel(); aktualizujKonto(); document.getElementById("listaZadanDziecko").innerHTML = ""; bazaZadan.forEach(z => { const li = document.createElement("li"); li.innerHTML = `<div class="akcja-info"><span class="akcja-nazwa">${z.nazwa}</span><span class="akcja-punkty">+${z.punkty} ⭐</span></div><button class="btn-wykonaj" style="padding: 12px; background-color:#f59e0b;">📤 Zgłoś!</button>`; li.querySelector('.btn-wykonaj').addEventListener('click', () => { oczekujaceZadania.push({ id: Date.now(), nazwa: z.nazwa, punkty: z.punkty }); zapiszWChmurze("gryOczekujace", oczekujaceZadania); renderujOczekujace(); alert(`Wysłano do sprawdzenia!`); }); document.getElementById("listaZadanDziecko").appendChild(li); }); document.getElementById("listaNagrodDziecko").innerHTML = ""; bazaNagrod.forEach(n => { const s = mojePunkty >= n.koszt; const li = document.createElement("li"); li.innerHTML = `<div class="akcja-info"><span class="akcja-nazwa">${n.nazwa}</span><span class="akcja-koszt">-${n.koszt} ⭐</span></div><button class="btn-kup" style="padding: 12px; border-radius:12px; ${s ? 'background-color: #ec4899;' : 'background-color: #cbd5e1; cursor: not-allowed;'}">${s ? '🎁 Wybieram!' : '🔒 Za mało ⭐'}</button>`; li.querySelector('.btn-kup').addEventListener('click', () => { if (s) { mojePunkty -= n.koszt; aktualizujPortfel(); renderujWidokDziecka(); alert(`Wybrałeś: ${n.nazwa}!`); } else { alert("Za mało punktów!"); } }); document.getElementById("listaNagrodDziecko").appendChild(li); }); }
    document.getElementById("btnDodajZadanie").addEventListener("click", () => { const n = document.getElementById("noweZadanieNazwa").value.trim(); const p = parseInt(document.getElementById("noweZadaniePunkty").value); if(n&&p) { bazaZadan.push({id:Date.now(), nazwa:n, punkty:p}); zapiszWChmurze("gryZadania", bazaZadan); document.getElementById("noweZadanieNazwa").value=""; document.getElementById("noweZadaniePunkty").value=""; renderujZadania(); }});
    document.getElementById("btnDodajNagrode").addEventListener("click", () => { const n = document.getElementById("nowaNagrodaNazwa").value.trim(); const k = parseInt(document.getElementById("nowaNagrodaKoszt").value); if(n&&k) { bazaNagrod.push({id:Date.now(), nazwa:n, koszt:k}); zapiszWChmurze("gryNagrody", bazaNagrod); document.getElementById("nowaNagrodaNazwa").value=""; document.getElementById("nowaNagrodaKoszt").value=""; renderujNagrody(); }});

    const oknoCzatu = document.getElementById("kontenerWiadomosci");

    function renderujCzat() {
        let powitanieHTML = "";
        if (czyPremium) {
            powitanieHTML = `<div class="dymek-czatu dymek-inny"><div class="czat-autor">${czyTrial ? "Asystent (Próbne Premium)" : "Asystent D@niel (Premium) 👑"}</div><div class="czat-tresc">Cześć! Potrafię zarządzać aplikacją. Spróbuj napisać:<br><br><i>"Ustaw stoper na 5 minut"</i><br><i>"Zapisz karmienie z prawej piersi"</i><br><i>"Podałem 5ml ibuprofenu"</i><br><i>"Wydałem 15 zł na lody"</i><br><i>"Młody zdał telefon"</i></div></div>`;
        } else {
            powitanieHTML = `<div class="dymek-czatu dymek-inny"><div class="czat-autor">Asystent D@niel (Wersja Darmowa) 🤖</div><div class="czat-tresc">Cześć! W darmowej wersji służę radą i wsparciem. Zapytaj mnie o katar lub poproś o żart.<br><br>W wersji <strong>Premium</strong> potrafię automatycznie zapisywać Twoje wydatki, leki i czas ekranowy!</div></div>`;
        }
        
        oknoCzatu.innerHTML = powitanieHTML;
        bazaCzatu.forEach(msg => {
            const div = document.createElement("div"); div.className = `dymek-czatu ${msg.moja ? 'dymek-moj' : 'dymek-inny'}`;
            div.innerHTML = `<div class="czat-autor">${msg.autor}</div><div class="czat-tresc">${msg.tekst}</div>`;
            oknoCzatu.appendChild(div);
        });
        oknoCzatu.scrollTop = oknoCzatu.scrollHeight;
    }

    document.querySelectorAll('.btn-szybka-akcja').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.getElementById("inputWiadomosci").value = e.target.innerText.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim(); 
            document.getElementById("btnWyslijWiadomosc").click();
        });
    });

    document.getElementById("btnWyslijWiadomosc").addEventListener("click", () => {
        const input = document.getElementById("inputWiadomosci"); const tekst = input.value.trim(); if (!tekst) return;
        
        bazaCzatu.push({ autor: "Ty", moja: true, tekst: tekst }); zapiszWChmurze("narzedziaAsystent", bazaCzatu); 
        input.value = ""; renderujCzat();

        const divPisze = document.createElement("div"); divPisze.className = "dymek-czatu dymek-inny";
        divPisze.innerHTML = `<div class="czat-autor">Asystent D@niel 🤖</div><div class="czat-tresc pisze-kropki">Myślę...</div>`; 
        oknoCzatu.appendChild(divPisze); oknoCzatu.scrollTop = oknoCzatu.scrollHeight;

        setTimeout(() => {
            oknoCzatu.removeChild(divPisze); 
            const zapytanie = tekst.toLowerCase();
            let odpTresc = "";

            const jestPremiumKomenda = zapytanie.includes("wydał") || zapytanie.includes("kupił") || zapytanie.includes("kosztował") || zapytanie.includes("wydatek") || 
                                       zapytanie.includes("stoper") || zapytanie.includes("odlicz") || 
                                       (zapytanie.includes("podał") && (zapytanie.includes("ml") || zapytanie.includes("ibuprofen") || zapytanie.includes("paracetamol"))) ||
                                       zapytanie.includes("sukces") || zapytanie.includes("osiągnięcie") || 
                                       zapytanie.includes("rozmiar") || 
                                       zapytanie.includes("kalendarz") || zapytanie.includes("zaplanuj") || 
                                       zapytanie.startsWith("zapisz ") || zapytanie.startsWith("przypomnij ") || 
                                       (zapytanie.includes("dodaj") && zapytanie.includes("punkt")) ||
                                       zapytanie.includes("oblicz") || zapytanie.includes("dawk") || 
                                       zapytanie.includes("karmienie") || zapytanie.includes("zjadł") || zapytanie.includes("wypił") ||
                                       zapytanie.includes("zdał") || zapytanie.includes("grał") || zapytanie.includes("konsol") || zapytanie.includes("telefon");

            if (jestPremiumKomenda && !czyPremium) {
                odpTresc = `Zarządzanie aplikacją z poziomu czatu to funkcja dostępna tylko w wersji <strong>Premium 👑</strong>.<br><br><button class="btn-wewnetrzny-link" onclick="document.getElementById('btnWrocAsystent').click(); document.getElementById('banerPremiumPulpit').click();">Odblokuj Premium</button>`;
            } 
            else {
                if (zapytanie.includes("zdał") || zapytanie.includes("grał") || zapytanie.includes("konsol") || zapytanie.includes("telefon")) {
                    const u = zapytanie.includes("telefon") ? "📱 Telefon" : (zapytanie.includes("konsol") ? "🎮 Konsola" : "💻 Komputer PC");
                    const a = zapytanie.includes("zdał") || zapytanie.includes("wyłączył") ? "🛑 Zdał sprzęt" : "▶️ Start";
                    const liczby = zapytanie.match(/\d+/); const c = liczby ? liczby[0] : "";
                    const d = new Date(); const dStr = d.getDate().toString().padStart(2,'0') + "." + (d.getMonth()+1).toString().padStart(2,'0') + "." + d.getFullYear(); const tStr = d.getHours().toString().padStart(2,'0')+":"+d.getMinutes().toString().padStart(2,'0');
                    if(typeof bazaEkrany !== 'undefined') { bazaEkrany.unshift({ id: Date.now(), urzadzenie: u, akcja: a, czas: c, data: dStr, godzina: tStr }); zapiszWChmurze("narzedziaEkrany", bazaEkrany); if(typeof renderujEkrany === "function") renderujEkrany(); }
                    odpTresc = `Zanotowano czas przed ekranem! Urządzenie: ${u}, Akcja: ${a}${c ? ' ('+c+' min)' : ''}. Widać postępy w cyfrowym detoksie! 🛡️`;
                }
                else if (zapytanie.includes("karmienie") || zapytanie.includes("zjadł") || zapytanie.includes("wypił")) {
                    const liczby = zapytanie.match(/\d+/); let typ = zapytanie.includes("lew") ? "Lewa Pierś" : (zapytanie.includes("praw") ? "Prawa Pierś" : "Butelka"); let ilosc = liczby ? liczby[0] : "";
                    const now = new Date(); const d = now.toISOString().split('T')[0]; const c = now.toTimeString().substring(0,5);
                    bazaKarmienie.unshift({ id: Date.now(), typ: typ, ilosc: ilosc, data: d, czas: c }); zapiszWChmurze("narzedziaKarmienie", bazaKarmienie); renderujKarmienie();
                    odpTresc = `Słodkiego apetytu! 🍼 Zanotowałem karmienie (${typ} ${ilosc ? ilosc+'ml' : ''}) o godzinie ${c}.`;
                }
                else if (zapytanie.includes("wydał") || zapytanie.includes("kupił") || zapytanie.includes("kosztował") || zapytanie.includes("wydatek")) {
                    const liczby = zapytanie.match(/\d+(\.\d+)?/);
                    if (liczby) {
                        const kwota = parseFloat(liczby[0]); const opisTytulu = tekst.replace(liczby[0], "").replace(/wydałem|wydałam|kupiłem|kupiłam|kosztowało|na|zł|wydatek/gi, "").trim() || "Zakupy (z czatu)";
                        const dStr = new Date().toLocaleString('pl-PL', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
                        historiaFinansow.unshift({ opis: opisTytulu.charAt(0).toUpperCase() + opisTytulu.slice(1), kwota: -kwota, data: dStr });
                        saldoFinansow -= kwota; zapiszWChmurze("gryHistoriaFinansow", historiaFinansow); aktualizujKonto(); renderujTransakcje();
                        odpTresc = `Zanotowano! Odjąłem <strong>${kwota} zł</strong> ze Skarbonki na "${opisTytulu}". Obecne saldo to ${saldoFinansow.toFixed(2)} zł. 💸`;
                    } else { odpTresc = `Zrozumiałem, że to wydatek, ale nie podałeś kwoty! Wpisz np. "Wydałem 15 zł na lody".`; }
                }
                else if (zapytanie.includes("stoper") || zapytanie.includes("odlicz")) {
                    const liczby = zapytanie.match(/\d+/);
                    if (liczby) { window.startStopera(parseInt(liczby[0]) * 60); odpTresc = `Zrobione! Stoper został ustawiony na <strong>${liczby[0]} minut</strong> i już tyka w tle! ⏱️ Możesz go sprawdzić na pulpicie.`;
                    } else { odpTresc = `Ile minut mam odliczać? Wpisz np. "Ustaw stoper na 5 minut".`; }
                }
                else if (zapytanie.includes("podał") && (zapytanie.includes("ml") || zapytanie.includes("ibuprofen") || zapytanie.includes("paracetamol"))) {
                    const lek = zapytanie.includes("ibuprofen") ? "Ibuprofen" : (zapytanie.includes("paracetamol") ? "Paracetamol" : "Inny lek");
                    const liczby = zapytanie.match(/\d+(\.\d+)?/); const dawka = liczby ? liczby[0] + " ml" : "Nieznana dawka"; const d = new Date(); 
                    bazaZdarzen.unshift({ typ: lek, lek: `💊 ${lek} (z czatu)`, dawka: dawka, czasWpisu: d.getTime(), godzinaWyswietlana: d.getHours().toString().padStart(2,'0')+":"+d.getMinutes().toString().padStart(2,'0') }); 
                    zapiszWChmurze("medHistoria", bazaZdarzen); odswiezZdarzenia();
                    odpTresc = `Zanotowałem w Apteczce! Podałeś <strong>${lek}</strong> w dawce <strong>${dawka}</strong> o godzinie ${d.getHours().toString().padStart(2,'0')+":"+d.getMinutes().toString().padStart(2,'0')}. Zdrowia! 🩺`;
                }
                else if (zapytanie.includes("sukces") || zapytanie.includes("osiągnięcie")) {
                    const nazwaSukcesu = tekst.replace(/dodaj sukces/i, "").replace(/zapisz sukces/i, "").replace(/osiągnięcie/i, "").trim() || "Nowy sukces dziecka!";
                    const d = new Date().toISOString().split('T')[0];
                    bazaOsiagniecia.push({id: Date.now(), nazwa: nazwaSukcesu.charAt(0).toUpperCase() + nazwaSukcesu.slice(1), data: d}); zapiszWChmurze("narzedziaOsiagniecia", bazaOsiagniecia); renderujOsiagniecia();
                    odpTresc = `Wielkie brawa! 🥳 Zapisano w Osiągnięciach: <strong>"${nazwaSukcesu}"</strong> z dzisiejszą datą. Oby tak dalej!`;
                }
                else if (zapytanie.includes("rozmiar")) {
                    const liczby = zapytanie.match(/\d+/);
                    if(liczby) {
                        const rodzaj = zapytanie.includes("but") ? "but" : (zapytanie.includes("ubran") ? "ubranie" : "wzrost"); const wartosc = liczby[0];
                        const d = new Date(); const dataStr = d.getDate().toString().padStart(2,'0') + "." + (d.getMonth()+1).toString().padStart(2,'0') + "." + d.getFullYear(); 
                        let nowyRozmiar = { id: Date.now(), wzrost: "", ubranie: "", but: "", data: dataStr };
                        if(rodzaj === "but") nowyRozmiar.but = wartosc; else if (rodzaj === "wzrost") nowyRozmiar.wzrost = wartosc; else nowyRozmiar.ubranie = wartosc;
                        bazaRozmiary.unshift(nowyRozmiar); zapiszWChmurze("narzedziaRozmiary", bazaRozmiary); renderujRozmiary();
                        odpTresc = `Zaktualizowałem garderobę! Twój nowy rozmiar to: <strong>${rodzaj} ${wartosc}</strong>. 👕 Zapisałem z dzisiejszą datą.`;
                    } else { odpTresc = "Jaki to rozmiar? Wpisz np. 'Rozmiar buta 28'."; }
                }
                else if (zapytanie.includes("kalendarz") || zapytanie.includes("zaplanuj")) {
                    const wydarzenie = tekst.replace(/dodaj do kalendarza/i, "").replace(/zaplanuj w kalendarzu/i, "").replace(/w kalendarzu/i, "").replace(/do kalendarza/i, "").trim();
                    const dStr = new Date().toISOString().split('T')[0];
                    bazaKalendarz.push({ id: Date.now(), tytul: wydarzenie.charAt(0).toUpperCase() + wydarzenie.slice(1), data: dStr, czas: "", dataPełna: `${dStr}T00:00` });
                    zapiszWChmurze("narzedziaKalendarz", bazaKalendarz); renderujKalendarz();
                    odpTresc = `Zrobione! Dodałem <strong>"${wydarzenie}"</strong> do Twojego Kalendarza na dzisiaj. Możesz wejść tam i zmienić datę. 📅`;
                }
                else if (zapytanie.startsWith("zapisz ") || zapytanie.startsWith("przypomnij ")) {
                    const notatka = tekst.replace(/zapisz /i, "").replace(/przypomnij /i, "").trim();
                    bazaNotatek.unshift({ id: Date.now(), tekst: notatka }); zapiszWChmurze("narzedziaNotatki", bazaNotatek); renderujNotatki();
                    odpTresc = `Jasne! Zapisałem na żółtej karteczce: <strong>"${notatka}"</strong>. Znajdziesz to w module Notatki. 📝`;
                }
                else if ((zapytanie.includes("dodaj") || zapytanie.includes("daj")) && zapytanie.includes("punkt")) {
                    const liczby = zapytanie.match(/\d+/);
                    if (liczby) {
                        const pkt = parseInt(liczby[0]); mojePunkty += pkt; aktualizujPortfel();
                        odpTresc = `Zrobione! Dodałem <strong>${pkt} ⭐</strong> do Skarbca. Masz teraz łącznie ${mojePunkty} punktów.`;
                    } else { odpTresc = `Wpisz dokładną liczbę, np. "Dodaj 15 punktów".`; }
                }
                else if (zapytanie.includes("oblicz") || zapytanie.includes("dawk") || (zapytanie.includes("ile") && (zapytanie.includes("paracetamol") || zapytanie.includes("ibuprofen")))) {
                    const p = bazaProfili.find(x => x.id == aktywnyProfilId) || bazaProfili[0];
                    if (!p || !p.waga || p.waga <= 0) { odpTresc = "Aby obliczyć dawkę, wpisz najpierw wagę dziecka w zakładce 'Profil' lub dodaj nowy 'Bilans'!"; } 
                    else {
                        const w = parseFloat(p.waga);
                        odpTresc = `Na podstawie wagi ${w} kg z Profilu (${p.imie}), jednorazowe dawki to:\n\n💊 **Ibuprofen (40mg/ml):** ${Math.round((w/4)*10)/10} ml\n💊 **Paracetamol (120mg/5ml):** ${Math.round(((w*15)/24)*10)/10} ml`;
                    }
                }
                else if (zapytanie.includes("żart") || zapytanie.includes("kawał") || zapytanie.includes("rozśmiesz")) {
                    const zarty = [ "Dlaczego komputer poszedł do lekarza? Bo złapał wirusa! 😂", "Co mówi informatyk, gdy dostaje na urodziny pendrive'a? Dzięki za pamięć! 🤓", "Jak nazywa się ulubiony zespół muzyczny dentystów? The Rolling Stones! 🎸🦷", "Spotykają się dwa pomidory na ulicy. Jeden mówi: cześć! Drugi na to: Keczup!" ];
                    odpTresc = zarty[Math.floor(Math.random() * zarty.length)];
                }
                else if (zapytanie.includes("zmęczon") || zapytanie.includes("mam dość") || zapytanie.includes("płacz") || zapytanie.includes("ciężki dzień")) {
                    odpTresc = "Widzę, że masz słabszy moment. Pamiętaj: jesteś wspaniałym rodzicem, a to tylko gorszy dzień, nie gorsze życie. ❤️ Zrób sobie gorącą herbatę, weź głęboki oddech. Każda burza kiedyś mija! Jestem tu dla Ciebie.";
                }
                else {
                    const googleQuery = encodeURIComponent(tekst); const linkGoogle = `https://www.google.com/search?q=${googleQuery}`;
                    odpTresc = `Znalazłem podpowiedzi w sieci na ten temat: <br><a href="${linkGoogle}" target="_blank" class="btn-google-search">🌍 Szukaj w Google</a>`;
                }
            }
            
            let nazwaBota = czyPremiumPelne ? "Asystent D@niel (Premium) 👑" : (czyTrial ? "Asystent (Próbne Premium)" : "Asystent D@niel 🤖");
            bazaCzatu.push({ autor: nazwaBota, moja: false, tekst: odpTresc.replace(/\n/g, "<br>") }); 
            zapiszWChmurze("narzedziaAsystent", bazaCzatu); renderujCzat();
        }, 1500); 
    });

    // ZAINICJOWANIE WIDOKÓW STARTOWYCH (Dla offline'u zanim Firebase odpowie)
    odswiezWszystkieWidoki();
});