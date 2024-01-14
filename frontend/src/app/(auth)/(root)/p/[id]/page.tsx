"use client";

import { Dropdown } from '../../../../../components/Dropdown/Dropdown';
import { useRouter } from 'next/navigation'

import clsx from 'clsx';


import { PFP } from '../../../../../components/pfp';


import React, { useEffect, useState } from 'react';

import axios from 'axios';

import { parseISO, differenceInMinutes, differenceInHours, differenceInDays, differenceInMonths, differenceInYears } from 'date-fns';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useProfilePic } from '@/components/ProfilePicContext';

import Image from 'next/image'

// Define the type for a comment
type Comment = {
  user_poster_id: number;
  user_display_name: string;
  content: string;
  likes_count: number;
  date_of_post: string;
  id: number;
  reply_to: number | null;
  replies: Comment[];
  hasChildren: boolean;
  profile_picture: string;
  is_liked: boolean;
  comment_count: number;
};

type Post = {
  user_poster_id: number;
  user_display_name: string;
  content: string;
  likes_count: number;
  date_of_post: string;
  id: number;
  reply_to: number | null;
  replies: Comment[];
  profile_picture: string;
  is_liked: boolean;
  comment_count: number;
};

interface UserPostBase {
  user_poster_id: Number;
  post_content: string;
  reply_to: number;
}


export default function Page({ params }: { params: { id: string } }) {
  const colors = ['indigo-500', 'red-500', 'blue-500', 'lime-500', 'purple-500'];
  const { status } = useSession();
  const { data: session } = useSession();
  const [postContent, setPostContent] = useState('');

  const id = parseInt(params.id);

  



  const router = useRouter();

  const [isFavorite, setIsFavorite] = useState(false);
  const [isChatBubble, setIsChatBubble] = useState(false);
  const [isChangeCircle, setIsChangeCircle] = useState(false);

  const [post, setPost] = useState<Post | null>({
    user_poster_id: 0,
    user_display_name: '',
    content: '',
    likes_count: 0,
    date_of_post: '',
    id: 0,
    reply_to: null,
    replies: [],
    profile_picture: '',
    is_liked: false,
    comment_count: 0,
  });  




  const { profilePicUrl } = useProfilePic();


  // Fetch the post and its comments when the component mounts
  useEffect(() => {
    if(session?.user.id) {
    axios.get(`http://localhost:8000/posts/${id}/comments`, {
      params: {
        user_id: session?.user.id
      }
    })
      .then(response => {
        console.log(response.data); // Log to check the response structure
        setPost(response.data);
      })
      .catch(error => console.error(error));
    }
  }, [session?.user.id]);

  const [likesCount, setLikesCount] = useState(post?.likes_count);
  const [hasLiked, setHasLiked] = useState(post?.is_liked);

  useEffect(() => {
  setLikesCount(post?.likes_count);
  setHasLiked(post?.is_liked);
  
  }, [post?.likes_count]);



  const formatRelativeTime = (dateString: string) => {
    const date = parseISO(dateString);
    let relativeTime = '';
    
    const minutes = differenceInMinutes(new Date(), date);
    const hours = differenceInHours(new Date(), date);
    const days = differenceInDays(new Date(), date);
    const months = differenceInMonths(new Date(), date);
    const years = differenceInYears(new Date(), date);
    
    if (minutes < 60) {
      relativeTime = `${minutes}m`;
    } else if (hours < 24) {
      relativeTime = `${hours}h`;
    } else if (days < 30) {
      relativeTime = `${days}d`;
    } else if (months < 12) {
      relativeTime = `${months}mo`;
    } else {
      relativeTime = `${years}y`;
    }
  
    return relativeTime;
  };

  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);

  const handleReplyClick = (commentId: number) => {
    if (activeReplyId === commentId) {
      setActiveReplyId(null);
      return;
    }
    setActiveReplyId(commentId);
  };

  const handleCopyClick = async () => {
    const textToCopy = `http://localhost:3000/p/${id}`; // Replace with the actual link
    try {
      await navigator.clipboard.writeText(textToCopy);

    } catch (err) {
    }
  };
  



  function toggleLike() {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/post/${id}/toggle_like/${session?.user.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === 'success') {
        setHasLiked((prevIsFavorite: boolean = false) => !prevIsFavorite);
        setLikesCount((prevCount: number) => prevCount + (hasLiked ? -1 : 1));
      } else {
        // Handle error
      }
    });
  }

  const handleReplySubmit = (replyContent: string, replyToId: number) => {
    console.log("Reply Content:", replyContent);
    console.log("Replying to Comment ID:", replyToId);
    // Add your logic to submit the reply
    setActiveReplyId(null); // Reset the active reply ID after submitting
  };

  useEffect(() => {
    // Scroll to top on page load
    window.scrollTo(0, 0);
  }, []);

  const [openComment, setOpenComment] = useState(false);

  const loadMoreComments = async (commentId: number) => {
    try {
      const response = await axios.get(`http://localhost:8000/posts/${commentId}/comments`);
      if (response.status === 200 && response.data && Array.isArray(response.data.replies)) {
        const newComments = response.data.replies.map((comment: { hasChildren: any; }) => ({
          ...comment,
          hasChildren: comment.hasChildren // Assuming the API provides this information
        }));
  
        setPost(prevState => {
          if (prevState) {
            const updatedReplies = addCommentsToTree(prevState.replies, commentId, newComments, false);
            return { ...prevState, replies: updatedReplies };
          }
          return null;
        });
      }
    } catch (error) {
      console.error('Error loading more comments:', error);
    }
  };
  
  const addCommentsToTree = (comments: Comment[], parentId: number, newComments: Comment[], updateHasChildren: boolean): Comment[] => {
    return comments.map(comment => {
      if (comment.id === parentId) {
        return { 
          ...comment, 
          replies: [...(comment.replies ?? []), ...newComments],
          hasChildren: updateHasChildren ? false : comment.hasChildren
        };
      } else if (comment.replies) {
        return { 
          ...comment, 
          replies: addCommentsToTree(comment.replies, parentId, newComments, updateHasChildren) 
        };
      } else {
        return comment;
      }
    });
  };
  
  
  

  // Recursive function to render a comment and its replies
  const renderComment = (comment: Comment, depth = 0) => (
    <div 
      key={comment.id} 
      className={clsx(
        'pt-2 pl-2 border-l', 
        { 'ml-[20px]': depth > 0},
        { 'bg-white': depth % 2 === 0, 'bg-slate-50': depth % 2 !== 0 },
        { [`border-${colors[depth % colors.length]}`]: depth > 0 }
      )}
    >
    <div className="flex items-start space-x-4">
      <div className="flex-shrink-0">
        <img className="inline-block h-10 w-10 rounded-full" src={comment.profile_picture} alt="Profile" />
      </div>
      <div className="flex-1 min-w-0">
        <div className='flex flex-col'>
          <div className='flex flex-row gap-x-1'>
            <p className='font-medium'>{comment.user_display_name}</p>
            <div className='' title={comment.date_of_post}>{formatRelativeTime(comment.date_of_post)}</div>
          </div>

            <div className='border-l border-t border-b p-2 rounded-l-lg overflow-hidden overflow-wrap break-words'>
            <p className='hyphens-auto'>{comment.content}</p>
            </div>
        </div>
        <button className="font-mono" onClick={() => handleReplyClick(comment.id)}>Reply</button>
      </div>
      </div>
      {activeReplyId === comment.id && (
        <div className="p-4 transition">
          {/* Flex container for PFP and the form */}
          <div className="flex items-start space-x-4">
            {/* PFP Column */}
            <div className="flex-shrink-0">
              <Image height={256} width={256} className="inline-block h-10 w-10 rounded-full" src={profilePicUrl} alt="Profile" />
            </div>

            {/* Form Column */}
            <div className="flex-1 min-w-0">
              <form action="#" className="h-[v30]">
                {/* Textarea container */}
                <div className="overflow-hidden rounded-lg shadow-sm ring-0 ring-gray-300 border outline-none focus-within:ring-indigo-600">
                  <textarea name="reply" id="reply" className="block w-full resize-none border-0 bg-transparent outline-none py-1.5 px-2 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 ring-0" 
                  placeholder="Write a reply..."></textarea>
                </div>

                {/* Button Container */}
                <div className="flex justify-end py-2">
                  <button type="submit" className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600" onClick={() => handleSubmit(comment.id)}>Post</button>
                </div>
              </form>
            </div>
          </div>
        </div>

      )}
      {comment.replies && comment.replies.map(reply => renderComment(reply, depth + 1))}
      
    {/* Load More Comments Button */}
    {comment.hasChildren && (
      <button 
        className="text-blue-500 hover:text-blue-700 text-sm font-semibold"
        onClick={() => loadMoreComments(comment.id)}>
        Load More Comments
      </button> )}

    </div>
  );
  

const handleSubmit = async (postID: number) => {
  //event.preventDefault();
  if (!session) {
    console.log('No active session');
    return;
  }

  console.log('Trying to pass!'); // The authenticated user
  if (!session.user || !session.user.name) {
    console.log('User or username is not defined');
    return;
  }

  // Create an instance of UserPostBase
  const userPost: UserPostBase = {
    user_poster_id: session.user.id, // replace with the actual username
    post_content: postContent,
    reply_to: postID,
  };

  console.log(userPost);

  try {
    console.log('Trying to wait for response!'); // The authenticated user
    const response = await fetch(`http://localhost:8000/post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userPost),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    console.log('Trying to wait for data pt 2!'); // The authenticated user
    console.log(response.status);

    console.log(response);
    const data = await response.json();
    if (data.status === 'success') {



      setPost(prevPost => {
        if (prevPost === null) {
          return null;
        }
      
        const newComment = data.comment;
      
        return {
          ...prevPost,
          replies: [newComment, ...prevPost.replies]
        };
      });



      setPostContent('');


    } else {
      console.log('it didnt work!')
      // Handle error
      console.error('Failed to create post');
    console.log('Post creation status:', data.status);
    // Handle post creation success
  } 
  }
   catch (error) {
        console.error('An error occurred:', error);
      }
    };


  return (
    <div className='w-full'>
      <div className="relative rounded-t-2xl w-full">
        <div className="flex pl-2 pr-4 rounded-t-2xl">
          <div className="relative flex flex-row rounded-3xl py-4 w-full">
          {post && (
          <>
            {/* Profile Picture Column */}
            <div className="flex flex-col justify-start items-center mr-4 flex-shrink-0">
              <Image width={256} height={256} className="rounded-full h-14 w-14 shadow-sm mb-4" src={post.profile_picture} alt="Author" />
            </div>

            {/* Content and Buttons Column */}
            {/* Content */}
            <div className="flex flex-col w-full">
              <div className="flex flex-col justify-between overflow-hidden">
                  <div>
                    {/* Author and Date */}
                    <div className='flex flex-row justify-between'>
                      <p className='font-medium'>{post.user_display_name}</p>
                      <div className='' title={post.date_of_post}>{formatRelativeTime(post.date_of_post)}</div>
                    </div>
                    {/* Content */}
                    <div className="overflow-hidden overflow-wrap break-words pb-2">
                      <p className="hyphens-auto">{post.content}</p>
                    </div>
                  </div>
                
                </div>

              <div className="flex w-full justify-between items-center">

                  <div className="flex items-center">
                    <span 
                      className={`cursor-pointer select-none material-symbols-sharp rounded-full p-2 ${hasLiked ? 'text-red-500' : 'text-slate-500'} hover:text-red-500 hover:bg-gray-200`} 
                      style={hasLiked ? {fontVariationSettings: "'FILL' 1, 'wght' 300, 'GRAD' -25, 'opsz' 24", padding: '10px'} : {fontVariationSettings: "'FILL' 0, 'wght' 200, 'GRAD' -25, 'opsz' 24", padding: '10px'}}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleLike();
                      }}
                    >
                      favorite
                    </span>
                    <p className="font-light" style={{ width: '10px', textAlign: 'right' }}>{likesCount}</p>            
                  </div>
                  <div className="flex items-center">
                    <span 
                      className={`cursor-pointer select-none material-symbols-sharp rounded-full p-2 ${openComment ? 'text-sky-500' : 'text-slate-500'} hover:text-sky-500 hover:bg-gray-200`} 
                      style={openComment ? {fontVariationSettings: "'FILL' 1, 'wght' 300, 'GRAD' -25, 'opsz' 24", padding: '10px'} : {fontVariationSettings: "'FILL' 0, 'wght' 200, 'GRAD' -25, 'opsz' 24", padding: '10px'}}
                    >
                      chat_bubble
                    </span>
                    <p className="font-light" style={{ width: '10px', textAlign: 'right' }}>{post.comment_count}</p>
                  </div>
                  <span 
                    className={`cursor-pointer select-none material-symbols-sharp rounded-full p-2 ${isChangeCircle ? 'text-lime-400' : 'text-slate-500'} hover:text-lime-600 hover:bg-gray-200`} 
                    style={isChangeCircle ? {fontVariationSettings: "'FILL' 1, 'wght' 300, 'GRAD' -25, 'opsz' 24"} : {fontVariationSettings: "'FILL' 0, 'wght' 200, 'GRAD' -25, 'opsz' 24"}}
                    onClick={() => setIsChangeCircle(!isChangeCircle)}
                  >
                    change_circle
                  </span>
                  <span 
                    className="cursor-pointer select-none material-symbols-sharp text-slate-500 hover:text-amber-600 hover:bg-gray-200 rounded-full p-2" 
                    style={true ? {fontVariationSettings: "'FILL' 1, 'wght' 200, 'GRAD' -25, 'opsz' 24"} : {}}
                    onClick={
                      (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCopyClick()
                      }
                    }
                  >
                    ios_share
                  </span>
                </div>
              </div>
          </>
        )}   </div>
        </div>
        <div className='backdrop-blur-sm border-slate-300 border-b border-t sticky top-0 z-10'>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=optional" />
        <div className="flex justify-around items-center">
              <div className={`rounded-full hover:bg-slate-200`}>
            <button className={`flex flex-row items-center justify-center pl-4 pr-4 border-b-2 border-blue-500 hover:border-blue-300`} onClick={() => router.back()}>
              <span title="arrow_back" className="mb-2 mt-2 text-sky-900  material-symbols-sharp"   style={{ fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' -25, 'opsz' 48" }}>
              arrow_back
              </span>
            </button>
          </div>
        </div>
        </div>
        {/* Reply box */}
        <div className="p-4 border-b">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              {profilePicUrl && 
              <Image height={256} width={256} className="inline-block h-10 w-10 rounded-full" src={profilePicUrl} alt=""/>
              }
            </div>
            <div className="min-w-0 flex-1">
              <form action="#" className="relative">
                <div className="overflow-hidden rounded-lg shadow-sm ring-0 ring-gray-300 border outline-none focus-within:ring-indigo-600">
                  <label className="sr-only">Add your comment</label>
                  <textarea name="comment" id="comment" className="block w-full resize-none border-0 bg-transparent outline-none py-1.5 px-2 text-gray-900 placeholder:text-gray-400 sm:text-sm sm:leading-6 ring-0" 
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Reply"></textarea>

                  <div className="py-2 px-4" aria-hidden="true">
                    <div className="py-px">
                      <div className="h-9 px-8"></div>
                    </div>
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-0 flex justify-between py-2 pl-3 pr-2">
                  <div className="flex items-center space-x-5">
                    <div className="flex items-center">
                    </div>
                    <div className="flex items-center">
                      <div>
            
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                  {post &&
                    <button 
                      type="submit" 
                      className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600" 
                      onClick={async (event) => {
                        event.preventDefault();
                        await handleSubmit(post.id);
                      }}
                    >
                      Post
                    </button>     
                  }            
                   </div>
                </div>
              </form>
            </div>
          </div>

        </div>
        <div>
        </div>
        <div>
        {post && post.replies.map((comment, index) => (
          <div key={comment.id}>
            {renderComment(comment)}
            {index < post.replies.length - 1 && <hr />}
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

