import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

interface QuoteState {
  currentQuoteIndex: number;
  usedQuotes: number[];
  lastShownTime: number;
  isEnabled: boolean;
  userId: string;
  pendingQuote: boolean; // New field to track if a quote is pending to be shown
}

interface LoginQuoteState {
  usedLoginQuotes: number[];
  userId: string;
}
interface MotivationalQuote {
  text: string;
}

// Custom study-focused messages - exactly as provided
const QUOTES: MotivationalQuote[] = [
  { text: "Stop overthinking. Open your book.\nStart reading now — not after five minutes.\nYou're wasting time you can never get back.\nSit down and do the work." },
  { text: "Don't wait to \"feel ready.\"\nStart studying whether you feel like it or not.\nWinners train without mood.\nYou're not here to be comfortable." },
  { text: "Focus only on your page.\nDon't look at your phone. Don't check messages.\nEvery second wasted is a step backward.\nControl your environment — and your mind." },
  { text: "Push past the boredom.\nThis is where growth begins.\nMost students quit here — you won't.\nYou'll rise because you don't give up." },
  { text: "Read like it matters — because it does.\nYour future depends on this hour.\nIf you want results, put in the work.\nNo shortcuts, no excuses." },
  { text: "Wake up. Show up.\nNobody is going to study for you.\nYou get what you give — nothing more.\nSo give your best, every time." },
  { text: "Open the chapter. Get started.\nDon't waste another minute wondering how hard it is.\nIt's hard for everyone — finish it anyway.\nThat's how progress is made." },
  { text: "Discipline is more important than motivation.\nYou won't always feel like studying.\nDo it anyway.\nThat's what makes you different." },
  { text: "You are not tired. You are just distracted.\nClose the tabs, close the noise.\nSit with your notes and get serious.\nYou have goals — chase them." },
  { text: "One page at a time.\nDon't chase perfection, chase consistency.\nEven 1% progress beats 0%.\nStart now. Keep going." },
  { text: "This is your job right now — study.\nTreat it like it's your duty.\nNo one becomes great by luck.\nThey earn it through focused effort." },
  { text: "Look around — distractions are everywhere.\nYou need to be different.\nYou need to choose growth over comfort.\nAnd it starts by opening that book." },
  { text: "This is not optional anymore.\nYou've wasted enough days.\nShow yourself what you're capable of.\nAnd stop negotiating with laziness." },
  { text: "You don't need motivation.\nYou need to stop running from effort.\nDiscipline is your best weapon.\nUse it right now." },
  { text: "Get your focus back.\nRemind yourself why you started.\nYou're not here to be average.\nYou're here to dominate your goal." },
  { text: "Be serious.\nEvery hour you waste will come back as regret.\nYou don't get this time again.\nRespect it." },
  { text: "Read the same line ten times if needed.\nBut don't walk away.\nPush until your brain understands.\nThat's how winners train." },
  { text: "Today matters.\nDon't say \"I'll study later.\"\nLater turns into never.\nStudy now." },
  { text: "Sit straight. Remove distractions.\nSet a timer and start.\nThe first five minutes will be tough.\nThen flow will take over." },
  { text: "You're capable of more than this.\nStop underestimating yourself.\nAct like the topper you want to be.\nAnd work like one — now." },
  { text: "Nothing changes until you do.\nIf you're behind, catch up.\nIf you're distracted, fix it.\nYou're in control — act like it." },
  { text: "Think long-term.\nExams come fast. Regret comes faster.\nYour future self is watching.\nDon't let them down." },
  { text: "You're not stuck. You're just not focused.\nYou know what to do.\nSo do it — now.\nNo overthinking, just action." },
  { text: "It's not about being smart.\nIt's about being consistent.\nYou show up every day, no matter what.\nThat's what brings success." },
  { text: "You chose this path — now honor it.\nStop escaping, stop delaying.\nIt's time to act like your goal matters.\nStudy like you mean it." },
  { text: "Get serious about your goal.\nThis is not the time to relax.\nThe syllabus won't complete itself.\nYou need to show up and do the work." },
  { text: "Enough planning. Enough thinking.\nYou already know what needs to be done.\nStop delaying it.\nJust begin." },
  { text: "Success doesn't wait.\nEvery second you waste is someone else getting ahead.\nYou're in a race — act like it.\nFocus now." },
  { text: "You don't get this day again.\nUse it or lose it — that's the rule.\nDon't end the day with regret.\nStart studying now." },
  { text: "Take control of your routine.\nIf you don't set your schedule, the world will.\nAnd you'll fall behind.\nDiscipline starts with you." },
  { text: "This is your responsibility.\nNot your parents', not your teachers'.\nYour effort determines your result.\nOwn it." },
  { text: "You're not behind — you're just unfocused.\nFix your attention. Fix your direction.\nYou still have time.\nUse it wisely." },
  { text: "You already know the distractions.\nNow remove them.\nThis is not punishment — this is training.\nShow that you can handle it." },
  { text: "Focus on the next 30 minutes.\nNot the entire syllabus.\nJust start — the rest will follow.\nOne block at a time." },
  { text: "Don't complain about stress if you won't study.\nYou can't wish for results without effort.\nPut your head down.\nWork first, relax later." },
  { text: "Stop comparing yourself to others.\nFocus on your own progress.\nYour job is to do better than yesterday.\nThat's all that matters." },
  { text: "Make yourself proud today.\nEven if it's just one topic.\nPut in focused effort.\nThat's how self-respect is built." },
  { text: "This is what commitment looks like.\nYou show up whether it's fun or not.\nYou don't break the chain.\nYou build momentum." },
  { text: "No excuses today.\nNot tired. Not busy.\nIf it's important, you'll make time.\nNow prove it." },
  { text: "Don't ask for motivation.\nEarn it through action.\nStart with a timer.\nGet into the flow." },
  { text: "Nobody is going to save you.\nNot in exams, not in life.\nYou have to do the hard work.\nStart now." },
  { text: "Don't expect confidence without preparation.\nStudy more, doubt less.\nThat's how it works.\nNo magic — just effort." },
  { text: "You've wasted enough time.\nNow it's time to focus.\nThis moment can change everything.\nTake it seriously." },
  { text: "You know what the topper is doing right now?\nThey're studying.\nWhat are you doing?\nFix that." },
  { text: "Be consistent.\nEven if it's boring, even if it's tough.\nYou're building your future.\nAct like it matters." },
  { text: "There's no perfect time.\nThis is the time.\nUse what you have.\nAnd get it done." },
  { text: "Remind yourself why you started.\nYou're not here to quit halfway.\nYou're here to finish strong.\nSo get back to work." },
  { text: "Each session counts.\nDon't take any lightly.\nYour future self is depending on you.\nMake it worth it." },
  { text: "You'll never \"feel\" ready.\nThat's not how discipline works.\nYou start now, ready or not.\nAnd you become stronger each time." },
  { text: "You've come too far to give up now.\nDon't let distraction win.\nOpen the book.\nFinish what you started." },
  { text: "Sit down. Breathe. Now begin.\nStop letting your mind wander.\nYou are here to win — not drift.\nStart the next topic." },
  { text: "That syllabus won't shrink by itself.\nYou need to face it head-on.\nProcrastination solves nothing.\nAction fixes everything." },
  { text: "Be uncomfortable — that's the point.\nGrowth comes from struggle.\nPush through the resistance.\nThat's where success lives." },
  { text: "The first 5 minutes are the hardest.\nStart anyway.\nOnce you're in, it flows.\nDon't wait for the mood." },
  { text: "Control your mind or it controls you.\nBe the master, not the slave.\nYou decide what matters now.\nMake studying the only priority." },
  { text: "No distractions now.\nNot the phone. Not the noise.\nThis time is yours — protect it.\nLock in and study." },
  { text: "This is not punishment.\nThis is preparation.\nYou're building strength for life.\nRespect the process." },
  { text: "You asked for success.\nThis is the price.\nHard hours, deep focus.\nDon't run from what you wanted." },
  { text: "You're not here to memorize.\nYou're here to understand.\nThink. Learn. Apply.\nThat's the path to mastery." },
  { text: "Skip one hour today — regret one week later.\nIt's not worth it.\nStay in the game.\nEarn the result you want." },
  { text: "This is your battlefield.\nYour book is your weapon.\nUse it wisely.\nEvery word is a step closer." },
  { text: "Stop chasing comfort.\nStart chasing growth.\nSuccess doesn't live in easy zones.\nGo beyond your limits." },
  { text: "Don't fake effort.\nDo it properly or don't do it at all.\nHalf-study brings full regret.\nBe honest with your hours." },
  { text: "Get used to silence.\nIt's where real focus happens.\nYou don't need music.\nYou need discipline." },
  { text: "This is not motivation.\nThis is command.\nPick up the book.\nAnd don't stop till the task is done." },
  { text: "Study like no one is coming to help.\nBecause no one is.\nYou are your own best chance.\nUse it." },
  { text: "Be better than yesterday.\nJust 1% more effort.\nIt adds up.\nAnd it beats perfection." },
  { text: "If you don't respect time,\nTime won't respect you.\nUse every block wisely.\nDon't waste what you can't rewind." },
  { text: "Stop letting the mind lie to you.\nYou're not \"too tired.\"\nYou're just untrained.\nTrain now." },
  { text: "Think bigger than marks.\nYou're building discipline, confidence, and clarity.\nThis is life training.\nShow up like it matters." },
  { text: "You will thank yourself later —\nOnly if you act now.\nComfort now is regret later.\nMake the right trade." },
  { text: "Do the tough chapters first.\nStop escaping the hard parts.\nFace them now.\nThat's how toppers are made." },
  { text: "The result is waiting.\nBut only for the consistent.\nStart small, but stay daily.\nThat's your real edge." },
  { text: "What you do today decides everything.\nOne strong session can change your week.\nSo don't waste it.\nUse this hour like gold." },
  { text: "Stop asking \"how much more?\"\nStart asking \"how well?\"\nDepth beats speed.\nStudy with intention." },
  { text: "Stop scrolling.\nClose every tab that's not study-related.\nGet back to your chapter.\nYou've wasted enough already." },
  { text: "Focus is not optional — it's required.\nNo shortcuts. No multitasking.\nOne book. One task.\nUntil it's done." },
  { text: "Start with what scares you.\nThe hard chapters won't disappear.\nAttack them head-on.\nAnd break the fear." },
  { text: "Every day you skip,\nSomeone else gets ahead.\nIf you want to catch up,\nYou better get moving." },
  { text: "Treat your books like sacred tools.\nNot things to fear or avoid.\nOpen them with respect.\nThen give them your full mind." },
  { text: "Forget motivation.\nYou need momentum.\nStart small, build fast.\nDon't wait to \"feel\" ready." },
  { text: "Stop planning in circles.\nYou already know what to do.\nExecution is the problem.\nFix that now." },
  { text: "This is your mind's training ground.\nNo one becomes sharp without effort.\nIf you want clarity,\nEarn it by studying hard." },
  { text: "You don't need perfect conditions.\nYou just need to start.\nDon't wait for silence or comfort.\nMake progress anyway." },
  { text: "The brain gets stronger with use.\nTreat it like a muscle.\nTrain daily.\nGet sharper, faster, better." },
  { text: "Don't study for marks.\nStudy for mastery.\nExams will come and go.\nUnderstanding will stay for life." },
  { text: "It's not just about how long.\nIt's about how deep.\nStudy with full presence.\nNot half-hearted attention." },
  { text: "You asked for change.\nThis is the work that makes it happen.\nSit down.\nNo more delays." },
  { text: "Quit the drama.\nThe syllabus is neutral.\nIt doesn't care how you feel.\nEither you complete it, or you don't." },
  { text: "Late nights are okay —\nIf you're using them wisely.\nNot for guilt, not for stress.\nBut for focused, silent effort." },
  { text: "Respect the subject.\nIt's not boring — you're distracted.\nChange how you study.\nNot what you study." },
  { text: "Make your study space sacred.\nNo food, no phone, no noise.\nJust effort, clarity, and discipline.\nProtect that space." },
  { text: "Don't give yourself options.\nDon't negotiate with laziness.\nTreat this like a mission.\nNon-negotiable. Unstoppable." },
  { text: "You already know what's right.\nYou just need to obey it.\nNo more tricks from your lazy mind.\nDiscipline wins today." },
  { text: "One topic well-studied\nBeats ten skimmed quickly.\nDon't rush to finish.\nRush to understand." },
  { text: "You're not falling behind.\nYou're just falling for distractions.\nCut them off.\nGet back in charge." },
  { text: "If the goal is big,\nThe effort must match.\nThis is not casual.\nGive it your all." },
  { text: "Start now. Not after lunch.\nNot after one video.\nThis second.\nMove." },
  { text: "Remember why you started.\nBring that fire back.\nYour dreams deserve better.\nEarn them through work." },
  { text: "This is how toppers think:\nNo complaints. No delays.\nThey just show up — daily.\nSo should you." },
  { text: "Stop waiting for the right mood.\nDiscipline doesn't care about feelings.\nPick up the book.\nYour future depends on it." },
  { text: "Don't overthink.\nStart the next subject now.\nEvery delay costs you.\nTake control, not excuses." },
  { text: "You've wasted enough time.\nNow prove to yourself what you can do.\nNo one else matters right now.\nJust you and your goal." },
  { text: "Study without needing to be told.\nThat's what separates the serious ones.\nBe your own commander.\nMove." },
  { text: "No more comparing.\nOthers don't live your life.\nYou study your way,\nBut study seriously." },
  { text: "This is not school anymore.\nThis is war with distraction.\nEither you win today,\nOr regret wins." },
  { text: "You are not tired.\nYou are distracted.\nFix your focus.\nAnd energy will return." },
  { text: "The more you delay,\nThe heavier the burden.\nLighten your load.\nStudy now." },
  { text: "You won't feel like it every day.\nBut do it anyway.\nThat's how champions are made.\nThrough action, not mood." },
  { text: "Stop chasing perfection.\nStart chasing consistency.\nShow up daily.\nLet success catch up." },
  { text: "That chapter won't vanish.\nFace it. Break it. Master it.\nAvoiding it makes it harder.\nTackle it now." },
  { text: "Don't chase motivation.\nBuild systems instead.\nTime block. Track. Show up.\nThat's real progress." },
  { text: "This is not beyond you.\nIt just needs time and focus.\nGive both — without drama.\nResults will follow." },
  { text: "Be the person who finishes.\nNot the one who starts strong,\nThen fades.\nPush through to the end." },
  { text: "Every wasted hour\nWill demand explanation later.\nDon't create regrets.\nUse your time." },
  { text: "You don't need 100% clarity.\nStart with 1% courage.\nBegin the task.\nThe rest will come." },
  { text: "Books are not your enemies.\nThey are your weapons.\nTreat them like allies.\nWield them daily." },
  { text: "This is your shift.\nYou're on duty.\nNo phones. No excuses.\nOnly study." },
  { text: "You've rested enough.\nNow rise.\nThis is the time to grind.\nNo more waiting." },
  { text: "That goal won't achieve itself.\nYou must build it.\nBrick by brick.\nSession by session." },
  { text: "Keep your promises to yourself.\nYou said you'd study.\nSo do it now.\nThat's how confidence is built." },
  { text: "Greatness is not given.\nIt's earned, page by page.\nYou've got pages to turn.\nSo start turning them." },
  { text: "Don't let one lazy day\nBecome a lazy habit.\nFix your rhythm.\nToday matters." },
  { text: "This is not for marks.\nThis is for your identity.\nProve to yourself\nThat you are not average." },
  { text: "The exam clock is ticking.\nEvery second counts.\nYou don't have time to waste.\nStudy like it's your last chance." },
  { text: "You are not behind.\nYou're just not starting.\nForget the noise.\nOpen the book." },
  { text: "No more setting timers you don't follow.\nStudy when you say you will.\nDiscipline isn't negotiable.\nKeep your own word." },
  { text: "No one's coming to save your marks.\nNo teacher. No friend.\nYou fix it yourself.\nStart now." },
  { text: "Keep your study space clean.\nKeep your focus cleaner.\nMessy desk, messy mind.\nSort it out." },
  { text: "That topic you're avoiding?\nIt's the one you need most.\nStop skipping.\nLearn it today." },
  { text: "If you're not revising,\nYou're forgetting.\nDon't trust memory.\nTrain it." },
  { text: "You said this year would be different.\nProve it with actions.\nDon't let another day\nLook like the last." },
  { text: "You're not \"too busy.\"\nYou're just unprioritized.\nStudy time is non-negotiable.\nTreat it like oxygen." },
  { text: "Your mind is sharp.\nBut only when used.\nUse it daily.\nSharpen it fully." },
  { text: "Failures are just feedback.\nDon't fear them.\nStudy more.\nFall less." },
  { text: "You want results?\nThen stop being casual.\nStudy like it matters.\nBecause it does." },
  { text: "Close the tabs.\nSilence the chats.\nGet in your zone.\nNow." },
  { text: "Don't confuse planning with progress.\nColor-coded timetables don't score marks.\nExecution does.\nStart executing." },
  { text: "The longer you sit idle,\nThe harder it becomes.\nDon't think.\nMove." },
  { text: "You're not doing this for marks.\nYou're doing it for mastery.\nTo rise.\nTo lead." },
  { text: "Others study in silence.\nYou scroll in noise.\nDecide what you want more.\nMarks or memes?" },
  { text: "It's okay to fall behind.\nIt's not okay to stay there.\nPick up.\nPush forward." },
  { text: "Don't study to impress.\nStudy to evolve.\nReal strength is silent.\nLet results speak." },
  { text: "Time is like a leaking bucket.\nDon't let laziness poke more holes.\nPatch it now.\nFocus hard." },
  { text: "That syllabus isn't finishing itself.\nStop acting surprised.\nYou chose this path.\nWalk it strong." },
  { text: "Studying isn't punishment.\nIt's power.\nLearn with pride.\nNot pressure." },
  { text: "Everyone gets tired.\nWinners still show up.\nSo rest later.\nRight now, study." },
  { text: "You're building something.\nEach chapter is a brick.\nStack it strong.\nDon't skip." },
  { text: "Study when it's boring.\nThat's how focus is built.\nNot with hype,\nBut with habit." },
  { text: "Treat each session like a battle.\nWin or lose — track it.\nLearn from it.\nAnd fight again tomorrow." },
  { text: "Don't wait for clarity.\nStart with confusion.\nClarity comes while working.\nSo begin now." },
  { text: "You don't lack time.\nYou waste it.\nCut distractions.\nEarn your hours back." },
  { text: "If you can't study for 60 minutes,\nStart with 15.\nNo excuses.\nJust action." },
  { text: "Don't fake planning.\nDon't overthink progress.\nStart writing.\nStart learning." },
  { text: "You said this was your dream.\nWhy aren't you chasing it daily?\nNo one owes you success.\nWork for it." },
  { text: "Keep your promises.\nEven when it's hard.\nStudy even when you're tired.\nThat's character." },
  { text: "Get uncomfortable.\nThat's where growth happens.\nComfort zones never create toppers.\nStep out." },
  { text: "If you stop now,\nYou start again later.\nDon't lose momentum.\nContinue." },
  { text: "Cut the drama.\nCut the guilt.\nCut the noise.\nJust study." },
  { text: "You don't need 10 hours today.\nYou need one focused hour.\nStart there.\nBuild up." },
  { text: "Doubt your excuses,\nNot your abilities.\nYou can do this.\nNow prove it." },
  { text: "This is your season.\nYour window.\nYour test.\nStudy like it." },
  { text: "Don't act surprised by results\nWhen your preparation is weak.\nEarn your marks\nThrough effort, not hope." },
  { text: "Procrastination is theft.\nIt's stealing your future.\nCatch it.\nStop it now." },
  { text: "Push your limits\nBefore limits push you.\nYou're more capable\nThan you think." },
  { text: "Focus isn't gifted.\nIt's trained.\nTrain it today.\nTrain it every session." },
  { text: "Today's effort\nBecomes tomorrow's result.\nDon't expect success\nFrom empty hours." },
  { text: "You are your own competition.\nBe better than yesterday.\nStudy harder.\nFocus sharper." },
  { text: "Stop restarting your plan.\nStick to one and execute.\nProgress comes from patience.\nNot resets." },
  { text: "If you're tired,\nRest for 10.\nThen return and win.\nDon't shut down." },
  { text: "No magic will happen later.\nThe magic is in now.\nSo stop wishing.\nStart studying." },
  { text: "The syllabus won't shrink.\nYou must grow stronger.\nOutlearn it.\nOutlast it." },
  { text: "Small efforts add up.\nDon't underestimate one session.\nMake it count.\nRight now." },
  { text: "If you want the reward,\nEarn the effort.\nBooks before breaks.\nDiscipline before delight." },
  { text: "You can feel pressure,\nBut don't stop.\nPressure creates diamonds.\nKeep going." },
  { text: "Don't check the clock.\nCheck your effort.\nTime passes anyway.\nMake it count." },
  { text: "You said you want success.\nThen act like it.\nTurn off the noise.\nPick up the book." },
  { text: "Every hour wasted today\nAdds pressure tomorrow.\nDon't delay the grind.\nStart now." },
  { text: "You're not here to try.\nYou're here to conquer.\nSo stop hesitating.\nAnd begin." },
  { text: "Don't let one lazy day\nBecome your habit.\nBreak the pattern.\nStudy now." },
  { text: "If you're bored,\nStudy deeper.\nEngagement comes from effort,\nNot entertainment." },
  { text: "This is your test.\nNot just academics — discipline too.\nShow up fully.\nDon't half-do it." },
  { text: "Stop waiting for motivation.\nIt's never on time.\nTrain your will.\nThat's what winners do." },
  { text: "One focused session\nCan shift your momentum.\nDon't waste the next hour.\nTurn it into progress." },
  { text: "You chose this goal.\nNow stand by it.\nWork, sweat, and finish strong.\nNo quitting." },
  { text: "You already know what to do.\nSo stop scrolling.\nStart executing.\nRight now." },
  { text: "Every page you skip\nWill chase you later.\nFace it now.\nAnd win early." },
  { text: "If it's tough,\nThat means you're growing.\nLean in.\nDon't run." },
  { text: "Delay distractions.\nNot your studies.\nThere's a time for everything.\nThis time is for learning." },
  { text: "You owe it to yourself\nTo try fully.\nNot half-hearted effort,\nBut full focus." },
  { text: "No one is checking on you.\nYou have to check yourself.\nPush your limits.\nBe accountable." },
  { text: "You've wasted enough weeks.\nDon't waste this one.\nMake this the comeback.\nStart today." },
  { text: "If it feels overwhelming,\nBreak it down.\nSmall steps still move you forward.\nNow take one." },
  { text: "You don't need another plan.\nYou need execution.\nOpen the book.\nDo the work." },
  { text: "The syllabus won't wait.\nSo don't delay.\nEvery topic matters.\nStart ticking boxes." },
  { text: "Build study like a habit,\nNot a task.\nDaily. Consistently.\nNo matter what." },
  { text: "If you quit now,\nYou'll regret later.\nIf you study now,\nYou'll thank yourself forever." },
  { text: "You've done hard things before.\nThis is no different.\nSo don't doubt it.\nJust start." },
  { text: "Don't just aim to pass.\nAim to master.\nBe the one who knows,\nNot just guesses." },
  { text: "If you feel stuck,\nStart something small.\nMotion beats thinking.\nAlways." },
  { text: "Don't say you'll do it later.\nLater becomes never.\nStudy now.\nFinish before excuses grow." },
  { text: "No more bargaining with yourself.\nYou've delayed enough.\nOpen the book.\nFinish what you started." },
  { text: "This chapter won't learn itself.\nStop thinking.\nStart reading.\nNow." },
  { text: "Get serious about your goal.\nNo one else will.\nRespect your ambition.\nProve it with effort." },
  { text: "If it feels tough,\nThat means it matters.\nDo it anyway.\nWithout debate." },
  { text: "Silence the notifications.\nSilence the world.\nYour focus is priority.\nProtect it." },
  { text: "Today is your chance.\nNot next week.\nDon't waste this window.\nUse it." },
  { text: "You've dreamed enough.\nNow it's time to act.\nStudying is the bridge.\nCross it." },
  { text: "Keep your mind clear.\nKeep your goals in sight.\nEvery page matters.\nTurn one now." },
  { text: "If you truly care,\nYou'll make time.\nIf not,\nYou'll keep making excuses." },
  { text: "Study even when it's hard.\nThat's what makes you strong.\nAnyone can start.\nFew finish." },
  { text: "There's no shortcut here.\nOnly sharp focus.\nSo stop searching.\nStart studying." },
  { text: "Forget being perfect.\nBe consistent.\nPerfection comes from\nShowing up daily." },
  { text: "You don't need a new day.\nYou need a new decision.\nChoose now.\nAnd commit." },
  { text: "Progress isn't always visible.\nBut it's happening.\nSo stay in motion.\nKeep going." },
  { text: "The page you ignore today\nBecomes the question you fear later.\nLearn it now.\nBe ready." },
  { text: "No one remembers your excuses.\nThey remember your results.\nLet those speak.\nStudy harder." },
  { text: "Waiting won't help.\nDoing will.\nSo stop delaying.\nStart winning." },
  { text: "You are not too late.\nYou're just one choice away.\nMake the right one.\nRight now." },
  { text: "Want to change your life?\nThen change your habits.\nBegin with one study session.\nBegin now." },
  { text: "Control your schedule,\nOr it controls you.\nPlan wisely.\nStudy deliberately." },
  { text: "Success doesn't chase people.\nIt follows effort.\nGive yours.\nDaily." },
  { text: "You're not tired.\nYou're distracted.\nGet back to focus.\nNow." },
  { text: "If it's important,\nIt deserves time.\nGive it your full mind.\nNo multitasking." },
  { text: "Don't waste time debating.\nYou know what to do.\nSo get to it.\nStudy begins now." },
  { text: "You've started.\nNow don't stop.\nMomentum is gold.\nProtect it." },
  { text: "The clock is ticking.\nNot for pressure — for purpose.\nUse every minute.\nMake it meaningful." },
  { text: "Stop acting busy.\nStart being productive.\nStudy smart.\nStudy now." },
  { text: "Goals don't work without grind.\nSo forget comfort.\nEmbrace the challenge.\nDo the work." },
  { text: "If you skip today,\nYou'll stack regret.\nBreak the pattern.\nOpen your books." },
  { text: "Distraction looks harmless.\nBut it steals dreams.\nChoose discipline.\nRight now." },
  { text: "Top ranks aren't luck.\nThey're built daily.\nStart stacking hours.\nBuild yours." },
  { text: "You said you want this.\nThen earn it.\nNot later —\nNow." },
  { text: "This isn't about pressure.\nIt's about potential.\nDon't waste yours.\nUse it fully." },
  { text: "Knowledge grows in silence.\nSo mute the noise.\nFocus deep.\nLet it sink in." },
  { text: "Your results reflect\nWhat you repeated.\nRepeat effort.\nRepeat focus." },
  { text: "Planning won't save you.\nExecution will.\nClose the planner.\nOpen the chapter." },
  { text: "Don't break your streak.\nNot today.\nShow up again.\nEven for 30 minutes." },
  { text: "There is no backup attempt.\nThis is it.\nSo give everything.\nRight now." },
  { text: "Don't count the pages.\nCount your focus.\nIf that's strong,\nEverything follows." },
  { text: "This isn't optional.\nIt's essential.\nYou said you're serious.\nNow prove it." },
  { text: "You already lost hours.\nDon't lose this one.\nSit down.\nStudy hard." },
  { text: "Study is not punishment.\nIt's power.\nUse it.\nClaim your edge." },
  { text: "Even slow progress\nBeats no effort.\nSo start small.\nStay consistent." },
  { text: "Talent fades without work.\nPut in the effort.\nMake it last.\nMake it count." },
  { text: "You can't skip struggle\nAnd still win.\nSo face the hard parts.\nAnd win anyway." },
  { text: "The mind wanders.\nPull it back.\nAgain and again.\nThat's focus." },
  { text: "Don't say \"one day.\"\nSay \"today.\"\nThen act like it.\nStudy." },
  { text: "Let others relax.\nYou rise.\nThat's how success\nSeparates itself." },
  { text: "If you're scared to fail,\nStudy harder.\nReplace fear\nWith readiness." },
  { text: "The chapter won't get easier.\nYou must get sharper.\nRead it again.\nUnderstand it now." },
  { text: "Don't wait for pressure.\nCreate discipline.\nSit, study, repeat —\nNo questions asked." },
  { text: "This isn't about comfort.\nIt's about direction.\nYou know where to go.\nStart walking." },
  { text: "You aren't behind.\nYou're distracted.\nCut the noise.\nReturn to focus." },
  { text: "Top results demand\nTop effort.\nYou're capable.\nSo act like it." },
  { text: "Thinking won't finish the task.\nDoing will.\nSo move.\nRight now." },
  { text: "Push past the boredom.\nThat's where winners grow.\nStay put.\nFinish strong." },
  { text: "Every excuse\nBuilds regret.\nChoose action.\nChoose now." },
  { text: "Your goal isn't far.\nYou're just standing still.\nTake a step.\nThen another." },
  { text: "The subject is hard?\nThen master it.\nDon't fear it.\nFight it." },
  { text: "Study without drama.\nQuietly. Daily.\nThat's how\nSuccess is built." },
  { text: "You're not here for fun.\nYou're here for results.\nBlock the distractions.\nEarn them." },
  { text: "Stop telling yourself stories.\nStart turning pages.\nTruth is in the action.\nNot the plans." },
  { text: "This isn't a game.\nThis is your future.\nWork like it matters.\nBecause it does." },
  { text: "Forget motivation.\nBuild routine.\nLet habit lead.\nNot emotion." },
  { text: "One hour of clarity\nBeats ten hours of noise.\nFocus sharp.\nThen go deep." },
  { text: "You know your weaknesses.\nNow attack them.\nDon't avoid them.\nThat's how you grow." },
  { text: "Nobody else is stopping you.\nIt's your own delay.\nBreak it.\nStudy now." },
  { text: "Be the student\nYou promised you'd be.\nNot just in talk.\nIn action." },
  { text: "Study like time is short.\nBecause it is.\nUse today.\nFully." },
  { text: "Don't overthink the task.\nJust begin.\nClarity follows\nAction." },
  { text: "The syllabus isn't impossible.\nYou just need consistency.\nGet back to it.\nKeep going." },
  { text: "Want to stand out?\nDo what others won't.\nStudy harder.\nLonger. Smarter." },
  { text: "Study isn't suffering.\nIt's training.\nTrain hard.\nWin later." },
  { text: "When in doubt,\nDon't scroll —\nJust start.\nThat's always the answer." },
  { text: "You've planned enough.\nNow execute.\nStart the timer.\nBegin the grind." },
  { text: "Stop fearing the hard topics.\nThey're your stepping stones.\nFace them now.\nBreak them down." },
  { text: "Every topper once\nFelt tired too.\nBut they didn't stop.\nNeither should you." },
  { text: "Don't study for results.\nStudy for strength.\nLet the marks\nChase your effort." },
  { text: "Wasting time\nCosts you more than marks.\nIt costs your peace.\nChoose wisely." },
  { text: "Want clarity?\nPut pen to paper.\nWrite, solve, revise —\nRepeat until done." },
  { text: "You don't need 10 hours.\nYou need 1 focused one.\nStart with that.\nRight now." },
  { text: "Your future isn't waiting.\nIt's built today.\nBrick by brick.\nPage by page." },
  { text: "Others may rest.\nYou may not.\nNot until your goals\nAre reality." },
  { text: "Remove the distractions.\nNot tomorrow.\nNow.\nThis minute." },
  { text: "You've done it before.\nYou can do it again.\nTrust your effort.\nGet to work." },
  { text: "There's no magic here.\nJust daily effort.\nSo sit.\nStudy." },
  { text: "You don't rise by chance.\nYou rise by habit.\nMake study\nYour strongest one." },
  { text: "You've complained enough.\nNow conquer.\nOpen the chapter.\nGet through it." },
  { text: "Comfort is the enemy.\nDiscipline is your ally.\nChoose wisely.\nChoose now." },
  { text: "Study like you're the only one\nWho can change your fate.\nBecause you are.\nSo start." },
  { text: "If you stop now,\nYou'll start again later —\nWith more pressure.\nAvoid that." },
  { text: "Others scroll.\nYou study.\nThat's how difference\nIs created." },
  { text: "Don't memorize blindly.\nUnderstand deeply.\nThat's what\nWinners do." },
  { text: "You said you want it.\nThen earn it.\nEach page matters.\nTurn one now." },
  { text: "Nobody remembers\nThe hours you wasted.\nBut you will.\nSo don't." },
  { text: "This subject won't master itself.\nYou must show up.\nConsistently.\nNo matter what." },
  { text: "Hard work feels heavy.\nBut regret feels worse.\nChoose the better pain.\nNow." },
  { text: "Stop predicting outcomes.\nStart preparing.\nStudy is your only\nReal control." },
  { text: "All progress starts\nWith showing up.\nSo sit down.\nAnd begin." }
];

// Login-specific quotes - shown immediately upon login
const LOGIN_QUOTES: MotivationalQuote[] = [
  { text: "You're in now —\nDon't waste this entry.\nOpen your books.\nLet's begin." },
  { text: "Logged in? Good.\nNow earn your login.\nStart studying.\nNo delay." },
  { text: "Don't scroll.\nDon't wander.\nStart your session.\nRight now." },
  { text: "You've entered the zone.\nAct like it.\nStudy like you mean it.\nNow." },
  { text: "The timer waits.\nBut your future doesn't.\nClick \"Start\".\nGo all in." },
  { text: "Enough tapping.\nStart tracking.\nYour success begins\nThis second." },
  { text: "This isn't for browsing.\nIt's for building.\nSo build your focus.\nStart now." },
  { text: "Entered the app?\nThen enter the grind.\nYou have work.\nBegin it now." },
  { text: "This login must mean something.\nProve it does.\nNo distractions.\nJust pure effort." },
  { text: "Tap less.\nThink less.\nStudy more.\nStart now." },
  { text: "You're here.\nThat means you're ready.\nDon't break the moment.\nStart studying." },
  { text: "Don't wait for motivation.\nIt comes after action.\nClick \"Start Session.\"\nLet it flow." },
  { text: "No more delays.\nNo more doubts.\nBegin the study.\nOwn your path." },
  { text: "You're in your temple.\nTreat study as worship.\nRespect this time.\nBegin now." },
  { text: "Login is your oath.\nKeep it.\nOpen the subject.\nDive deep." },
  { text: "You opened the app —\nNow open your mind.\nStart learning.\nFully present." },
  { text: "Discipline starts\nWith a single click.\nDon't hesitate.\nStart now." },
  { text: "This app isn't for scrolling.\nIt's for sharpening.\nSharpen your will.\nHit study mode." },
  { text: "If you're here,\nThen you're capable.\nDon't wait.\nJust begin." },
  { text: "Your entry matters only\nIf you act on it.\nAct now.\nStart studying." },
  { text: "Login done.\nNow action must follow.\nOpen the book.\nStudy with force." },
  { text: "This isn't time pass.\nIt's time power.\nUse it.\nStart your focus." },
  { text: "This second is a chance.\nDon't skip it.\nSet your timer.\nEnter deep work." },
  { text: "You said you're serious.\nNow prove it.\nHit \"Start.\"\nNo excuses." },
  { text: "The clock is watching.\nMake it count.\nDon't wait.\nBegin study now." }
];
export const useMotivationalQuotes = (userId: string) => {
  // Create user-specific key for localStorage
  const storageKey = `motivationalQuotes_${userId}`;
  const loginQuoteStorageKey = `loginQuotes_${userId}`;
  
  const [quoteState, setQuoteState] = useLocalStorage<QuoteState>(storageKey, {
    currentQuoteIndex: 0,
    usedQuotes: [],
    lastShownTime: 0,
    isEnabled: true,
    userId: userId,
    pendingQuote: false
  });

  const [loginQuoteState, setLoginQuoteState] = useLocalStorage<LoginQuoteState>(loginQuoteStorageKey, {
    usedLoginQuotes: [],
    userId: userId
  });
  const [currentQuote, setCurrentQuote] = useState<MotivationalQuote | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: '20%', left: '20%' });
  const [lastCursorMoveTime, setLastCursorMoveTime] = useState(Date.now());

  // Update userId if it changes (user switches)
  useEffect(() => {
    if (quoteState.userId !== userId) {
      setQuoteState(prev => ({
        ...prev,
        userId: userId
      }));
    }
    if (loginQuoteState.userId !== userId) {
      setLoginQuoteState(prev => ({
        ...prev,
        userId: userId
      }));
    }
  }, [userId, quoteState.userId, setQuoteState]);

  // Track cursor movement
  useEffect(() => {
    const handleMouseMove = () => {
      setLastCursorMoveTime(Date.now());
      
      // Check if there's a pending quote to show
      if (quoteState.pendingQuote && quoteState.isEnabled) {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
        
        // Check if enough time has passed since last quote
        if (now - quoteState.lastShownTime >= oneHour) {
          console.log(`Cursor movement detected for user ${userId}. Showing pending quote.`);
          showPendingQuote();
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [quoteState.pendingQuote, quoteState.isEnabled, quoteState.lastShownTime, userId]);

  // Generate random position for toast
  const generateRandomPosition = useCallback(() => {
    const positions = [
      { top: '10%', left: '10%' },
      { top: '10%', right: '10%' },
      { top: '20%', left: '50%', transform: 'translateX(-50%)' },
      { top: '30%', left: '15%' },
      { top: '30%', right: '15%' },
      { top: '50%', left: '10%' },
      { top: '50%', right: '10%' },
      { top: '70%', left: '20%' },
      { top: '70%', right: '20%' },
      { bottom: '10%', left: '10%' },
      { bottom: '10%', right: '10%' },
      { bottom: '20%', left: '50%', transform: 'translateX(-50%)' }
    ];
    
    return positions[Math.floor(Math.random() * positions.length)];
  }, []);

  // Get next quote
  const getNextQuote = useCallback(() => {
    if (!quoteState.isEnabled || QUOTES.length === 0) return null;

    let nextIndex;
    
    // If all quotes have been used, reset the cycle
    if (quoteState.usedQuotes.length >= QUOTES.length) {
      // Start fresh cycle with a random quote
      nextIndex = Math.floor(Math.random() * QUOTES.length);
      setQuoteState(prev => ({
        ...prev,
        usedQuotes: [nextIndex],
        currentQuoteIndex: nextIndex
      }));
      console.log(`All 300 quotes shown to user ${userId}. Restarting cycle.`);
    } else {
      // Find next unused quote randomly
      do {
        nextIndex = Math.floor(Math.random() * QUOTES.length);
      } while (quoteState.usedQuotes.includes(nextIndex));
      
      setQuoteState(prev => ({
        ...prev,
        usedQuotes: [...prev.usedQuotes, nextIndex],
        currentQuoteIndex: nextIndex
      }));
      console.log(`Showing random quote ${quoteState.usedQuotes.length + 1}/300 to user ${userId} (Quote #${nextIndex + 1})`);
    }

    return QUOTES[nextIndex];
  }, [quoteState, setQuoteState, userId]);

  // Show pending quote when cursor moves
  const showPendingQuote = useCallback(() => {
    if (!quoteState.isEnabled || !quoteState.pendingQuote) return;

    const quote = getNextQuote();
    if (!quote) return;

    setCurrentQuote(quote);
    setPosition(generateRandomPosition());
    setIsVisible(true);

    // Update state - quote shown, no longer pending
    setQuoteState(prev => ({
      ...prev,
      lastShownTime: Date.now(),
      pendingQuote: false
    }));

    // Auto-hide after 25 seconds (will be handled by component's auto-minimize)
    setTimeout(() => {
      setIsVisible(false);
    }, 25000);
  }, [quoteState.isEnabled, quoteState.pendingQuote, getNextQuote, generateRandomPosition, setQuoteState]);

  // Check for quote eligibility every hour
  useEffect(() => {
    if (!quoteState.isEnabled) return;

    const checkForQuote = () => {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
      
      // Check if enough time has passed since last quote
      if (now - quoteState.lastShownTime >= oneHour) {
        console.log(`Hour passed for user ${userId}. Setting quote as pending.`);
        // Mark quote as pending - will show when cursor moves
        setQuoteState(prev => ({
          ...prev,
          pendingQuote: true
        }));
      }
    };

    // Check immediately on mount
    checkForQuote();

    // Then check every 5 minutes to see if an hour has passed
    const interval = setInterval(checkForQuote, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [quoteState.isEnabled, quoteState.lastShownTime, setQuoteState, userId]);

  // Show login quote immediately
  const showLoginQuote = useCallback(() => {
    if (!quoteState.isEnabled || LOGIN_QUOTES.length === 0) return;

    let nextIndex;
    
    // If all login quotes have been used, reset the cycle
    if (loginQuoteState.usedLoginQuotes.length >= LOGIN_QUOTES.length) {
      // Start fresh cycle with a random quote
      nextIndex = Math.floor(Math.random() * LOGIN_QUOTES.length);
      setLoginQuoteState(prev => ({
        ...prev,
        usedLoginQuotes: [nextIndex]
      }));
      console.log(`All 25 login quotes shown to user ${userId}. Restarting cycle.`);
    } else {
      // Find next unused login quote randomly
      do {
        nextIndex = Math.floor(Math.random() * LOGIN_QUOTES.length);
      } while (loginQuoteState.usedLoginQuotes.includes(nextIndex));
      
      setLoginQuoteState(prev => ({
        ...prev,
        usedLoginQuotes: [...prev.usedLoginQuotes, nextIndex]
      }));
      console.log(`Showing login quote ${loginQuoteState.usedLoginQuotes.length + 1}/25 to user ${userId} (Quote #${nextIndex + 1})`);
    }

    const loginQuote = LOGIN_QUOTES[nextIndex];
    setCurrentQuote(loginQuote);
    setPosition(generateRandomPosition());
    setIsVisible(true);

    // Auto-hide after 25 seconds (will be handled by component's auto-minimize)
    setTimeout(() => {
      setIsVisible(false);
    }, 25000);
  }, [quoteState.isEnabled, loginQuoteState.usedLoginQuotes, setLoginQuoteState, generateRandomPosition, userId]);

  // Hide quote manually
  const hideQuote = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Toggle quotes enabled/disabled
  const toggleQuotes = useCallback(() => {
    setQuoteState(prev => ({
      ...prev,
      isEnabled: !prev.isEnabled,
      pendingQuote: false // Clear any pending quote when disabling
    }));
    
    // Hide current quote if disabling
    if (quoteState.isEnabled) {
      setIsVisible(false);
    }
  }, [quoteState.isEnabled, setQuoteState]);

  return {
    currentQuote,
    isVisible,
    position,
    isEnabled: quoteState.isEnabled,
    hideQuote,
    toggleQuotes,
    showLoginQuote,
    showLoginQuote,
    showQuote: () => {
      // Force show a quote for testing (bypasses cursor movement requirement)
      const quote = getNextQuote();
      if (quote) {
        setCurrentQuote(quote);
        setPosition(generateRandomPosition());
        setIsVisible(true);
        setQuoteState(prev => ({
          ...prev,
          lastShownTime: Date.now(),
          pendingQuote: false
        }));
        setTimeout(() => setIsVisible(false), 25000);
      }
    },
    // Add progress info for debugging
    getProgress: () => ({
      shown: quoteState.usedQuotes.length,
      total: QUOTES.length,
      userId: userId,
      cycleComplete: quoteState.usedQuotes.length >= QUOTES.length,
      pendingQuote: quoteState.pendingQuote,
      lastShownTime: new Date(quoteState.lastShownTime).toLocaleString(),
      nextEligibleTime: new Date(quoteState.lastShownTime + 60 * 60 * 1000).toLocaleString()
    })
  };
};