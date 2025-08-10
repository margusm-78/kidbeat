import Head from 'next/head'
import App from '../src/App'

export default function Home() {
  return (
    <>
      <Head>
        <title>KidBeat - Friendly Drum Machine</title>
        <meta name="description" content="A fun, kid-friendly drum machine optimized for iPad" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="KidBeat" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <App />
    </>
  )
}