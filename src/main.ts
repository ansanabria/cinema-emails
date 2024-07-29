import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { Database } from './supabase.js';
import { format } from 'date-fns';
import { Cinema } from './types.js';
import { getCurrentDate } from './helper.js';
// import { writeFile } from 'fs';

enum TypeEmoji {
  'normal' = '',
  'estreno' = '🍿',
  'preventa' = '💥',
}

const TODAY = format(getCurrentDate('es-CO'), 'yyyy-MM-dd');

const supabase = createClient<Database>(
  process.env.SUPABASE_PROJECT_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function getMovies() {
  const { data: cinemas, error: cinemasError } = await supabase
    .from('cinemas')
    .select('cinema');
  if (cinemasError) throw cinemasError;
  const cinemasArray = Array.from(new Set(cinemas.map(({ cinema }) => cinema)));

  const { data: movies, error: moviesError } = await supabase
    .from('movies')
    .select();
  if (moviesError) throw moviesError;

  let showsHTML = (
    await Promise.all(
      movies.map(async (mov) => {
        const showByCinema: Cinema[] = [];
        let type = 'normal';
        for (const cin of cinemasArray) {
          const { data: cinData, error: cinError } = await supabase
            .from('cinemas')
            .select()
            .eq('cinema', cin)
            .eq('movie_id', mov.id)
            .eq('date', TODAY);
          if (cinError) throw cinError;
          if (cinData.length > 0) {
            showByCinema.push(cinData.at(0));
            if (type === 'normal' && cinData.at(0).type !== 'normal') {
              type = cinData.at(0).type;
            }
          } else {
            return '';
          }
        }
        let cinemaStr = `${TypeEmoji[type]} ${mov.name}`.trim();
        cinemaStr = cinemaStr.concat(
          showByCinema
            .map((show) => ` <a href="${show.href}">${show.cinema}</a>`)
            .join(' '),
        );
        return cinemaStr;
      }),
    )
  ).filter((movieStr) => movieStr !== '');

  showsHTML.sort((a, b) => {
    const firstCharA = a.at(0);
    const firstCharB = b.at(0);
    const emojis = `${TypeEmoji.estreno}${TypeEmoji.preventa}`;
    if (emojis.includes(firstCharA) && !emojis.includes(firstCharB)) {
      return -1;
    } else if (!emojis.includes(firstCharA) && emojis.includes(firstCharB)) {
      return 1;
    } else {
      return 0;
    }
  });

  showsHTML = showsHTML.map((show) => `<li>${show}</li>`);

  return showsHTML.join('');
}

async function sendCinemaEmails() {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.APP_MAIL,
      pass: process.env.APP_PASS,
    },
  });
  const moviesHTML = await getMovies();
  const mailOptions = {
    from: process.env.APP_MAIL,
    to: process.env.APP_MAIL,
    subject: 'Cineco movies today',
    html: moviesHTML,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}

sendCinemaEmails();
