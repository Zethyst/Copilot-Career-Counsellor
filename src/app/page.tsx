import React from 'react'
import { ChatLayout } from './components/ChatLayout'
import  { Toaster } from 'react-hot-toast';

function page() {
  return (
    <>
    <ChatLayout/>
    <Toaster/>
    </>
  )
}

export default page