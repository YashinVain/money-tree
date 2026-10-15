// mp4.js — сборка обычного (не «нарезанного») файла MP4 из готовых кадров H.264.
// Кадры кодирует браузер (WebCodecs, формат avc: длина + NAL), а этот модуль
// раскладывает их в коробки MP4: ftyp, moov (описание дорожки) и mdat (данные).
// Описание стоит перед данными — видео начинает играть сразу, и у файла честная
// длительность (её проверяет консоль Яндекс Игр).

function box(type, ...parts) {
    const body = Buffer.concat(parts);
    const head = Buffer.alloc(8);
    head.writeUInt32BE(body.length + 8, 0);
    head.write(type, 4, 'ascii');
    return Buffer.concat([head, body]);
}
const u8 = (v) => Buffer.from([v & 255]);
const u16 = (v) => { const b = Buffer.alloc(2); b.writeUInt16BE(v); return b; };
const u32 = (v) => { const b = Buffer.alloc(4); b.writeUInt32BE(v >>> 0); return b; };
const zeros = (n) => Buffer.alloc(n);
const full = (version, flags) => Buffer.concat([u8(version), Buffer.from([(flags >> 16) & 255, (flags >> 8) & 255, flags & 255])]);
// Единичная матрица преобразования (поворота нет)
const MATRIX = Buffer.concat([u32(0x00010000), u32(0), u32(0), u32(0), u32(0x00010000), u32(0), u32(0), u32(0), u32(0x40000000)]);

/**
 * samples: [{ data: Buffer, key: boolean }], avcC: Buffer (decoderConfig.description)
 * fps: кадров в секунду (у всех кадров одинаковая длительность)
 */
function mux({ samples, avcC, width, height, fps }) {
    const timescale = fps * 1000, delta = 1000;
    const durTs = samples.length * delta;
    const durMs = Math.round(samples.length * 1000 / fps);

    const avc1 = box('avc1',
        zeros(6), u16(1),                          // зарезервировано, data_reference_index
        zeros(16),                                 // pre_defined, reserved
        u16(width), u16(height),
        u32(0x00480000), u32(0x00480000),          // 72 dpi
        u32(0), u16(1),                            // reserved, frame_count
        zeros(32),                                 // имя кодека (пусто)
        u16(0x0018), Buffer.from([0xff, 0xff]),    // глубина цвета 24, pre_defined -1
        box('avcC', avcC));
    const stsd = box('stsd', full(0, 0), u32(1), avc1);
    const stts = box('stts', full(0, 0), u32(1), u32(samples.length), u32(delta));
    const keys = samples.map((s, i) => (s.key ? i + 1 : 0)).filter(Boolean);
    const stss = box('stss', full(0, 0), u32(keys.length), ...keys.map(u32));
    const stsc = box('stsc', full(0, 0), u32(1), u32(1), u32(samples.length), u32(1));
    const stsz = box('stsz', full(0, 0), u32(0), u32(samples.length), ...samples.map(s => u32(s.data.length)));
    const build = (offset) => {
        const stco = box('stco', full(0, 0), u32(1), u32(offset));
        const stbl = box('stbl', stsd, stts, stss, stsc, stsz, stco);
        const dinf = box('dinf', box('dref', full(0, 0), u32(1), box('url ', full(0, 1))));
        const vmhd = box('vmhd', full(0, 1), u16(0), zeros(6));
        const minf = box('minf', vmhd, dinf, stbl);
        const hdlr = box('hdlr', full(0, 0), u32(0), Buffer.from('vide'), zeros(12), Buffer.from('VideoHandler\0'));
        const mdhd = box('mdhd', full(0, 0), u32(0), u32(0), u32(timescale), u32(durTs), u16(0x55c4), u16(0));   // язык «und»
        const mdia = box('mdia', mdhd, hdlr, minf);
        const tkhd = box('tkhd', full(0, 3), u32(0), u32(0), u32(1), u32(0), u32(durMs), zeros(8), u16(0), u16(0), u16(0), u16(0),
            MATRIX, u32(width << 16), u32(height << 16));
        const trak = box('trak', tkhd, mdia);
        const mvhd = box('mvhd', full(0, 0), u32(0), u32(0), u32(1000), u32(durMs), u32(0x00010000), u16(0x0100), zeros(10),
            MATRIX, zeros(24), u32(2));
        return box('moov', mvhd, trak);
    };
    const ftyp = box('ftyp', Buffer.from('isom'), u32(512), Buffer.from('isomiso2avc1mp41'));
    // Размер moov не зависит от значения смещения, поэтому считаем его в два прохода
    const moovSize = build(0).length;
    const moov = build(ftyp.length + moovSize + 8);
    const mdat = box('mdat', ...samples.map(s => s.data));
    return Buffer.concat([ftyp, moov, mdat]);
}

module.exports = { mux };
