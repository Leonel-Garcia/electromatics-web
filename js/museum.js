const masters = [
    {
        name: "William Gilbert",
        years: "1544 - 1603",
        title: "Padre de la Ciencia Eléctrica",
        bio: "Médico y físico inglés, considerado el padre de la electricidad y el magnetismo. Fue el primero en acuñar el término 'eléctrico' y distinguir entre magnetismo y electricidad estática. (Unidad de fuerza magnetomotriz: Gilbert)",
        inventions: ["Versorium", "Terrella", "Estudio del magnetismo terrestre"],
        quote: "El imán es el alma de la tierra, pues posee una fuerza que anima y dirige.",
        image: "images/museum/william_gilbert.png"
    },
    {
        name: "Benjamin Franklin",
        years: "1706 - 1790",
        title: "El Domador del Rayo",
        bio: "Político, científico e inventor estadounidense. Demostró que los rayos son electricidad y definió los conceptos de carga positiva y negativa.",
        inventions: ["Pararrayos", "Lentes bifocales", "Estufa Franklin"],
        quote: "Dime y lo olvido, enséñame y lo recuerdo, involúcrame y lo aprendo.",
        image: "images/museum/franklin_portrait.jpg"
    },
    {
        name: "Charles-Augustin de Coulomb",
        years: "1736 - 1806",
        title: "El Medidor de Fuerzas",
        bio: "Físico e ingeniero francés. Estableció la ley matemática que rige la interacción entre cargas eléctricas, fundamental para la electrostática. (Unidad de carga eléctrica: Coulomb)",
        inventions: ["Balanza de torsión", "Ley de Coulomb", "Estudios de fricción"],
        quote: "Las ciencias son monumentos a la gloria del espíritu humano.",
        image: "images/museum/charles_coulomb.png"
    },
    {
        name: "Pieter van Musschenbroek",
        years: "1692 - 1761",
        title: "El Padre del Condensador",
        bio: "Científico neerlandés. Inventó la botella de Leyden, el primer dispositivo capaz de almacenar carga eléctrica, sentando las bases para los condensadores modernos.",
        inventions: ["Botella de Leyden", "Almacenamiento de carga", "Primer condensador"],
        quote: "He descubierto un terrible secreto: la electricidad puede ser acumulada.",
        image: "images/museum/musschenbroek_portrait.png"
    },
    {
        name: "James Watt",
        years: "1736 - 1819",
        title: "El Motor de la Revolución",
        bio: "Ingeniero mecánico e inventor escocés. Sus mejoras en la máquina de vapor fueron fundamentales para la Revolución Industrial. (Unidad de potencia: Vatio)",
        inventions: ["Máquina de vapor mejorada", "Regulador centrífugo", "Indicador de presión"],
        quote: "No vendo nada que el mundo no quiera tener: POTENCIA.",
        image: "images/museum/james_watt.png"
    },
    {
        name: "Luigi Galvani",
        years: "1737 - 1798",
        title: "Descubridor de la Bioelectricidad",
        bio: "Médico y físico italiano. Sus experimentos con ranas revelaron que la electricidad podía estimular el movimiento muscular, sentando las bases de la neurofisiología.",
        inventions: ["Bioelectricidad", "Galvanismo", "Pila galvánica (precursor)"],
        quote: "La electricidad es la fuerza vital que anima a los seres vivos.",
        image: "images/museum/luigi_galvani.png"
    },
    {
        name: "Alessandro Volta",
        years: "1745 - 1827",
        title: "Pionero de la Potencia",
        bio: "Físico italiano, inventor de la pila eléctrica y descubridor del metano. La unidad de fuerza electromotriz del Sistema Internacional lleva su nombre. (Unidad de tensión eléctrica: Voltio)",
        inventions: ["Pila voltaica", "Electróforo", "Descubrimiento del metano"],
        quote: "El lenguaje de la experiencia es más autorizado que cualquier otro razonamiento.",
        image: "images/museum/volta_portrait_1764281020186.png"
    },
    {
        name: "André-Marie Ampère",
        years: "1775 - 1836",
        title: "Matemático de la Electricidad",
        bio: "Físico y matemático francés que fue uno de los fundadores de la ciencia del electromagnetismo clásico, que él denominó 'electrodinámica'. (Unidad de corriente eléctrica: Amperio)",
        inventions: ["Solenoide", "Telégrafo eléctrico (teórico)", "Ley de Ampère"],
        quote: "La investigación de las verdades matemáticas me ha acostumbrado a la certeza.",
        image: "images/museum/ampere_portrait_1764281034368.png"
    },
    {
        name: "Hans Christian Ørsted",
        years: "1777 - 1851",
        title: "El Eslabón Perdido",
        bio: "Físico y químico danés. Descubrió la relación fundamental entre la electricidad y el magnetismo al observar cómo una corriente desviaba una brújula. (Unidad de campo magnético: Oersted)",
        inventions: ["Electromagnetismo", "Aluminio (aislamiento)", "Piezómetro"],
        quote: "El experimento no falla, falla el experimentador al no saber interrogar a la naturaleza.",
        image: "images/museum/hans_oersted.png"
    },
    {
        name: "Carl Friedrich Gauss",
        years: "1777 - 1855",
        title: "El Príncipe de los Matemáticos",
        bio: "Matemático y físico alemán. Formuló la ley de Gauss para el campo eléctrico y magnético, una de las ecuaciones de Maxwell. (Unidad de inducción magnética: Gauss)",
        inventions: ["Magnetómetro", "Telégrafo electromagnético", "Ley de Gauss"],
        quote: "Los encantos de esta ciencia sublime, las matemáticas, sólo se le revelan a aquellos que tienen el valor de profundizar en ella.",
        image: "images/museum/carl_gauss.png"
    },
    {
        name: "Georg Ohm",
        years: "1789 - 1854",
        title: "Legislador de los Circuitos",
        bio: "Físico y matemático alemán. Formuló la ley que lleva su nombre, fundamental para entender la relación entre voltaje, corriente y resistencia. (Unidad de resistencia eléctrica: Ohmio)",
        inventions: ["Ley de Ohm", "Acústica"],
        quote: "La resistencia es inútil... si no se calcula correctamente.",
        image: "images/museum/ohm_portrait_1764281286534.png"
    },
    {
        name: "Michael Faraday",
        years: "1791 - 1867",
        title: "Padre del Electromagnetismo",
        bio: "Científico británico que contribuyó al estudio del electromagnetismo y la electroquímica. Sus principales descubrimientos incluyen la inducción electromagnética. (Unidad de capacitancia: Faradio)",
        inventions: ["Motor eléctrico", "Dinamo", "Jaula de Faraday", "Leyes de la electrólisis"],
        quote: "Nada es demasiado maravilloso para ser cierto si obedece a las leyes de la naturaleza.",
        image: "images/museum/faraday_portrait_1764280976156.png"
    },
    {
        name: "Samuel Morse",
        years: "1791 - 1872",
        title: "El Comunicador Global",
        bio: "Inventor y pintor estadounidense. Revolucionó las comunicaciones con la invención del telégrafo eléctrico de un solo cable y el código Morse.",
        inventions: ["Telégrafo eléctrico", "Código Morse"],
        quote: "¿Qué ha hecho Dios?",
        image: "images/museum/samuel_morse.png"
    },
    {
        name: "Joseph Henry",
        years: "1797 - 1878",
        title: "El Descubridor de la Inducción",
        bio: "Físico estadounidense. Descubrió la inducción electromagnética independientemente de Faraday y desarrolló el electroimán práctico. (Unidad de inductancia: Henry)",
        inventions: ["Electroimán mejorado", "Relé eléctrico", "Inducción electromagnética"],
        quote: "Las semillas de los grandes descubrimientos flotan constantemente a nuestro alrededor.",
        image: "images/museum/joseph_henry_new.png"
    },
    {
        name: "Wilhelm Eduard Weber",
        years: "1804 - 1891",
        title: "El Señor del Flujo",
        bio: "Físico alemán. Trabajó con Gauss en el magnetismo y desarrolló un sistema de unidades eléctricas. (Unidad de flujo magnético: Weber)",
        inventions: ["Telégrafo electromagnético", "Magnetómetro", "Electrodinamómetro"],
        quote: "La medida es el primer paso hacia el conocimiento.",
        image: "images/museum/wilhelm_weber.png"
    },
    {
        name: "Heinrich Lenz",
        years: "1804 - 1865",
        title: "El Legislador de la Inducción",
        bio: "Físico báltico alemán. Formuló la Ley de Lenz, que describe la dirección de la corriente inducida y la conservación de la energía en la inducción electromagnética.",
        inventions: ["Ley de Lenz", "Efecto Joule-Lenz"],
        quote: "La corriente inducida fluye en una dirección tal que se opone a la causa que la produce.",
        image: "images/museum/heinrich_lenz.png"
    },
    {
        name: "George Boole",
        years: "1815 - 1864",
        title: "El Padre de la Lógica Digital",
        bio: "Matemático y filósofo inglés. Inventor del álgebra de Boole, que marca los fundamentos de la aritmética computacional moderna.",
        inventions: ["Álgebra de Boole", "Lógica simbólica"],
        quote: "No hay método general para la solución de cuestiones en la teoría de probabilidades que no dependa del principio de combinación de afirmaciones.",
        image: "images/museum/george_boole.png"
    },
    {
        name: "Werner von Siemens",
        years: "1816 - 1892",
        title: "El Industrial de la Electricidad",
        bio: "Inventor e industrial alemán. Fundador de la empresa Siemens. Inventó el generador eléctrico de dinamo. (Unidad de conductancia: Siemens)",
        inventions: ["Dinamo eléctrica", "Telégrafo de aguja", "Locomotora eléctrica"],
        quote: "El progreso técnico es la base de la prosperidad económica.",
        image: "images/museum/werner_siemens.png"
    },
    {
        name: "James Prescott Joule",
        years: "1818 - 1889",
        title: "El Guardián de la Energía",
        bio: "Físico inglés. Estudió la naturaleza del calor y descubrió su relación con el trabajo mecánico, lo que condujo a la ley de la conservación de la energía. (Unidad de energía: Julio)",
        inventions: ["Ley de Joule", "Equivalente mecánico del calor", "Efecto Joule-Thomson"],
        quote: "Creo que he hecho dos o tres pequeñas cosas, pero nada que haga mucho ruido.",
        image: "images/museum/james_joule.png"
    },
    {
        name: "Gustav Kirchhoff",
        years: "1824 - 1887",
        title: "Maestro de los Circuitos",
        bio: "Físico alemán. Sus leyes sobre voltaje y corriente en circuitos eléctricos son fundamentales para la ingeniería eléctrica moderna.",
        inventions: ["Leyes de Kirchhoff", "Espectroscopio", "Radiación de cuerpo negro"],
        quote: "No hay nada más práctico que una buena teoría.",
        image: "images/museum/gustav_kirchhoff.png"
    },
    {
        name: "Lord Kelvin (William Thomson)",
        years: "1824 - 1907",
        title: "El Señor de la Energía",
        bio: "Físico y matemático británico. Fundamental en la termodinámica y en el éxito del primer cable telegráfico transatlántico. (Unidad de temperatura: Kelvin)",
        inventions: ["Escala Kelvin", "Galvanómetro de espejo", "Cable transatlántico"],
        quote: "Si no puedes medirlo, no puedes mejorarlo.",
        image: "images/museum/lord_kelvin.png"
    },
    {
        name: "Joseph Swan",
        years: "1828 - 1914",
        title: "El Verdadero Padre de la Bombilla",
        bio: "Físico y químico británico. Inventó la lámpara incandescente antes que Edison y desarrolló el papel fotográfico de bromuro. Su casa fue la primera del mundo iluminada con electricidad.",
        inventions: ["Lámpara incandescente", "Papel bromuro", "Rejilla de Swan"],
        quote: "La invención es una evolución, no una creación repentina.",
        image: "images/museum/joseph_swan.png"
    },
    {
        name: "James Clerk Maxwell",
        years: "1831 - 1879",
        title: "El Unificador de Fuerzas",
        bio: "Físico escocés cuya formulación de la teoría clásica de la radiación electromagnética unificó por primera vez la electricidad, el magnetismo y la luz. (Unidad de flujo magnético: Maxwell)",
        inventions: ["Ecuaciones de Maxwell", "Fotografía en color", "Teoría cinética de los gases"],
        quote: "La verdadera lógica de este mundo está en el cálculo de probabilidades.",
        image: "images/museum/maxwell_portrait_1764281006090.png"
    },
    {
        name: "George Westinghouse",
        years: "1846 - 1914",
        title: "Impulsor de la Corriente Alterna",
        bio: "Empresario e ingeniero estadounidense. Fue el principal rival de Edison y financió a Tesla para imponer la corriente alterna como estándar mundial.",
        inventions: ["Freno de aire ferroviario", "Transformador (mejora)", "Sistema de distribución CA"],
        quote: "Si algún día dicen de mí que con mi trabajo he contribuido al bienestar de mis semejantes, estaré satisfecho.",
        image: "images/museum/westinghouse_improved.png"
    },
    {
        name: "Thomas Edison",
        years: "1847 - 1931",
        title: "El Mago de Menlo Park",
        bio: "Inventor y empresario estadounidense. Desarrolló muchos dispositivos que influyeron enormemente en la vida en todo el mundo, incluyendo el fonógrafo y la bombilla eléctrica práctica.",
        inventions: ["Bombilla incandescente", "Fonógrafo", "Cámara de cine", "Distribución de CC"],
        quote: "El genio es un uno por ciento de inspiración y un noventa y nueve por ciento de transpiración.",
        image: "images/museum/edison_portrait_1764280962812.png"
    },
    {
        name: "Alexander Graham Bell",
        years: "1847 - 1922",
        title: "La Voz a Distancia",
        bio: "Científico e inventor escocés-estadounidense. Patentó el primer teléfono práctico y fundó la American Telephone and Telegraph Company (AT&T). (Unidad de nivel de potencia: Decibelio)",
        inventions: ["Teléfono", "Fotófono", "Detector de metales"],
        quote: "Cuando una puerta se cierra, otra se abre.",
        image: "images/museum/alexander_graham_bell.png"
    },
    {
        name: "Galileo Ferraris",
        years: "1847 - 1897",
        title: "El Descubridor del Campo Giratorio",
        bio: "Físico e ingeniero eléctrico italiano. Descubrió independientemente el principio del campo magnético rotativo, fundamental para el desarrollo de los motores eléctricos de corriente alterna polifásica.",
        inventions: ["Campo Magnético Giratorio", "Motor de inducción (Teórico)", "Transformador trifásico"],
        quote: "No soy un inventor, soy un profesor de física.",
        image: "images/museum/galileo_ferraris.jpg"
    },
    {
        name: "John Ambrose Fleming",
        years: "1849 - 1945",
        title: "El Pionero de la Electrónica",
        bio: "Ingeniero eléctrico y físico inglés. Inventó la válvula termoiónica (diodo), marcando el inicio de la electrónica moderna.",
        inventions: ["Válvula Fleming (Diodo)", "Regla de la mano derecha"],
        quote: "La ciencia es la búsqueda de la verdad.",
        image: "images/museum/john_ambrose_fleming_new.png"
    },
    {
        name: "Oliver Heaviside",
        years: "1850 - 1925",
        title: "El Ermitaño Matemático",
        bio: "Físico y matemático inglés. Simplificó las ecuaciones de Maxwell y desarrolló el cálculo operacional y la teoría de líneas de transmisión.",
        inventions: ["Ecuaciones del telegrafista", "Cálculo operacional", "Capa Heaviside"],
        quote: "¿Debo rechazar mi cena porque no entiendo completamente el proceso de la digestión?",
        image: "images/museum/oliver_heaviside.png"
    },
    {
        name: "Hendrik Lorentz",
        years: "1853 - 1928",
        title: "El Arquitecto del Electrón",
        bio: "Físico neerlandés, ganador del Nobel. Unificó el electromagnetismo de Maxwell con la materia, introduciendo el concepto de electrón. Sus transformaciones sentaron las bases matemáticas para la relatividad de Einstein. (Unidad de fuerza: Lorentz)",
        inventions: ["Fuerza de Lorentz", "Transformaciones de Lorentz", "Teoría del electrón"],
        quote: "Las imágenes que nos formamos de los fenómenos naturales no son la realidad misma, sino herramientas mentales para comprenderla.",
        image: "images/museum/hendrik_lorentz.png"
    },
    {
        name: "Herta Ayrton",
        years: "1854 - 1923",
        title: "La Dama del Arco Eléctrico",
        bio: "Ingeniera y matemática británica. Realizó investigaciones cruciales sobre el arco eléctrico y mejoró la tecnología de los faros y reflectores.",
        inventions: ["Mejoras en arco eléctrico", "Ventilador Ayrton"],
        quote: "Un error que abre el camino a la verdad es más útil que una verdad que bloquea el camino al error.",
        image: "images/museum/herta_ayrton.png"
    },
    {
        name: "Nikola Tesla",
        years: "1856 - 1943",
        title: "El Genio de la Corriente Alterna",
        bio: "Ingeniero e inventor serbio-estadounidense, conocido por diseñar el sistema de suministro eléctrico de corriente alterna (CA) moderno. (Unidad de inducción magnética: Tesla)",
        inventions: ["Motor de inducción", "Bobina de Tesla", "Radio", "Control remoto"],
        quote: "El presente es de ellos; el futuro, por el que realmente trabajé, es mío.",
        image: "images/museum/tesla_portrait_1764280949717.png"
    },
    {
        name: "J.J. Thomson",
        years: "1856 - 1940",
        title: "El Descubridor del Electrón",
        bio: "Físico británico. Descubrió el electrón, la primera partícula subatómica, revolucionando la comprensión de la electricidad como un flujo de partículas.",
        inventions: ["Descubrimiento del electrón", "Espectrometría de masas", "Modelo atómico"],
        quote: "El electrón es el constituyente fundamental de toda la materia.",
        image: "images/museum/jj_thomson.png"
    },
    {
        name: "Heinrich Hertz",
        years: "1857 - 1894",
        title: "Descubridor de las Ondas",
        bio: "Físico alemán que demostró la existencia de las ondas electromagnéticas, confirmando la teoría de Maxwell y abriendo el camino a la radio. (Unidad de frecuencia: Hertz)",
        inventions: ["Antena dipolo", "Transmisor de chispa", "Efecto fotoeléctrico"],
        quote: "No creo que las ondas inalámbricas que he descubierto tengan ninguna aplicación práctica.",
        image: "images/museum/hertz_improved.png"
    },
    {
        name: "Charles Proteus Steinmetz",
        years: "1865 - 1923",
        title: "El Mago de Schenectady",
        bio: "Matemático e ingeniero eléctrico. Desarrolló teorías matemáticas para la corriente alterna y la histéresis, permitiendo la expansión de las redes eléctricas.",
        inventions: ["Teoría de circuitos CA", "Ley de Steinmetz", "Generador de rayos artificiales"],
        quote: "Ningún hombre llega a ser un tonto hasta que deja de hacer preguntas.",
        image: "images/museum/charles_steinmetz.png"
    },
    {
        name: "Lee De Forest",
        years: "1873 - 1961",
        title: "El Padre de la Radio (Autoproclamado)",
        bio: "Inventor estadounidense. Su invención del Audion (triodo) permitió la amplificación de señales electrónicas, haciendo posible la radiodifusión.",
        inventions: ["Audion (Triodo)", "Phonofilm"],
        quote: "He descubierto un Imperio Invisible del Aire.",
        image: "images/museum/lee_de_forest_new.png"
    },
    {
        name: "Guglielmo Marconi",
        years: "1874 - 1937",
        title: "El Padre de la Radio",
        bio: "Inventor e ingeniero eléctrico italiano. Desarrolló un sistema de telegrafía sin hilos que sentó las bases de la radio moderna.",
        inventions: ["Telegrafía sin hilos", "Radio", "Antena monopolo"],
        quote: "El espacio es un medio de comunicación.",
        image: "images/museum/guglielmo_marconi_new.png"
    },
    {
        name: "Edith Clarke",
        years: "1883 - 1959",
        title: "Pionera de la Ingeniería Eléctrica",
        bio: "Primera ingeniera eléctrica profesora en EE.UU. Inventó la calculadora gráfica 'Clarke' para resolver problemas de líneas de transmisión eléctrica.",
        inventions: ["Calculadora Clarke", "Análisis de sistemas de potencia"],
        quote: "No hay demanda de ingenieras mujeres, por muy talentosas que sean. (Desafiando el status quo)",
        image: "images/museum/edith_clarke.png"
    },
    {
        name: "Edwin Armstrong",
        years: "1890 - 1954",
        title: "El Genio de la Radio FM",
        bio: "Ingeniero eléctrico estadounidense. Inventó la radio de frecuencia modulada (FM) y circuitos fundamentales como el superheterodino.",
        inventions: ["Radio FM", "Circuito regenerativo", "Receptor superheterodino"],
        quote: "No es que no se pueda hacer, es que no saben cómo hacerlo.",
        image: "images/museum/edwin_armstrong.png"
    },
    {
        name: "William Shockley",
        years: "1910 - 1989",
        title: "El Padre del Transistor",
        bio: "Físico estadounidense. Lideró el equipo que inventó el transistor, el componente fundamental de toda la electrónica moderna y la computación.",
        inventions: ["Transistor de unión", "Diodo Shockley"],
        quote: "El transistor es el invento más importante del siglo XX.",
        image: "images/museum/william_shockley.png"
    },
    {
        name: "Claude Shannon",
        years: "1916 - 2001",
        title: "El Padre de la Teoría de la Información",
        bio: "Matemático e ingeniero eléctrico estadounidense. Su tesis de maestría demostró que el álgebra booleana podía utilizarse para analizar y sintetizar circuitos de conmutación y relés.",
        inventions: ["Teoría de la información", "Diseño de circuitos digitales", "Teorema de muestreo"],
        quote: "La información es la resolución de la incertidumbre.",
        image: "images/museum/claude_shannon.png"
    }
];

// DOM Elements
const gridContainer = document.getElementById('museum-grid');
const modal = document.getElementById('hero-modal');
const modalContent = document.getElementById('modal-content');
const closeModalBtn = document.getElementById('close-modal');
const prevModalBtn = document.getElementById('prev-modal');
const nextModalBtn = document.getElementById('next-modal');

let currentModalIndex = 0;

// Initialize Gallery
function initGallery() {
    gridContainer.innerHTML = '';
    masters.forEach((master, index) => {
        const card = document.createElement('div');
        card.className = 'museum-card';
        card.onclick = () => openModal(index);
        
        card.innerHTML = `
            <div class="card-image" style="background-image: url('${master.image}')"></div>
            <div class="card-info">
                <h3>${master.name}</h3>
                <span>${master.years}</span>
            </div>
        `;
        gridContainer.appendChild(card);
    });
}

// Modal Functions
function openModal(index) {
    currentModalIndex = index;
    renderModalContent();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function renderModalContent() {
    const master = masters[currentModalIndex];
    
    // Fade out effect could be added here, but for now direct replacement
    modalContent.innerHTML = `
        <div class="hero-layout">
            <div class="hero-image" style="background-image: url('${master.image}')"></div>
            <div class="hero-details">
                <div class="hero-header">
                    <span class="hero-years">${master.years}</span>
                    <h1 class="hero-name">${master.name}</h1>
                    <h2 class="hero-title">${master.title}</h2>
                </div>
                
                <p class="hero-bio">${master.bio}</p>
                
                <div class="hero-inventions">
                    <h3>Invenciones y Aportes</h3>
                    <div class="tags">
                        ${master.inventions.map(inv => `<span class="tag">${inv}</span>`).join('')}
                    </div>
                </div>
                
                <blockquote class="hero-quote">
                    "${master.quote}"
                </blockquote>
            </div>
        </div>
    `;
}

function nextSlide() {
    currentModalIndex = (currentModalIndex + 1) % masters.length;
    renderModalContent();
}

function prevSlide() {
    currentModalIndex = (currentModalIndex - 1 + masters.length) % masters.length;
    renderModalContent();
}

// Event Listeners
closeModalBtn.addEventListener('click', closeModal);
nextModalBtn.addEventListener('click', nextSlide);
prevModalBtn.addEventListener('click', prevSlide);

// Close on outside click
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

// Keyboard Navigation
document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('active')) return;
    
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowRight') nextSlide();
    if (e.key === 'ArrowLeft') prevSlide();
});

// Start
initGallery();
