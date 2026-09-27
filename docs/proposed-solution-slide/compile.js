// Compile script for the 2-slide SIH26146 deck:
//   Slide 1: Proposed Solution (mirrors template slide-2)
//   Slide 2: Technical Approach (mirrors template slide-3)
// Output: slides/output/SIH26146_Deck.pptx

const pptxgen = require('pptxgenjs');

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 — matches SIH submission template

// Theme keys mirror the template's actual color roles:
//   primary   = body text  -> dark slate (#0F172A)
//   secondary = muted text -> slate-500
//   accent    = primary highlight -> ink-blue (#2563EB) — matches project accent
//   light     = panel background
//   bg        = slide background -> white
const theme = {
  primary:   '0F172A',
  secondary: '64748B',
  accent:    '2563EB',
  light:     'F1F5F9',
  bg:        'FFFFFF'
};

require('./slides/slide-04.js').createSlide(pres, theme);
require('./slides/slide-01.js').createSlide(pres, theme);
require('./slides/slide-02.js').createSlide(pres, theme);
require('./slides/slide-03.js').createSlide(pres, theme);

pres.writeFile({ fileName: './slides/output/SIH26146_Deck.pptx' })
    .then(file => console.log('Wrote: ' + file));