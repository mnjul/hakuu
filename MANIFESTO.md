# Why Manifesto instead of Readme?

This repo has the source code of [Hakuu](https://hakuu.mnjul.net/), the latest
of my personal website series *Mnjul's Intimate Home*. I'm releasing the source
code as a promise to myself that I build my personal website of the greatest
quality as with my other open source projects; allowing others to study or use
my work is not my goal here. Thus, there's no readme. This manifesto is to
declare that I provide zero support for this repo, and much of the technical
implementation detail will not be open for debate --- this is my personal
website, and the design, process, tooling and approach to implementing it all
have my personal quirkiness embodied ubiquitously.

Please also refer to my [series of blog posts](https://blogs.purincess.tw/matrixblog/2018/06/hakuu-in-the-making-0)
detailing the process of making Hakuu.

# Whereas...

## ECMAScript 2017 (aka. ES8) is served as-is, without transpiling

Of course, I know there are folks still using Internet Explorer, older versions
of Firefox ESR, iOS or Android, or even Windows Phones, for legitimate or
not-so-legitimate reasons ("Newer iOS slows my iPhone down so I'm not going to
upgrade" is the latter due to software vulnerabilities). If I am building a
service platform, I aim to make it accessible to 99.9% of my potential users.
Personal website? Not so much.

And gosh, I loathe transpilers. They hinder the progression of the web, giving
users excuses to stick with older software. Mark my words: I hate supporting
older software and having another layer of abstraction to debug.
Additionally, transpilers are best at dealing with syntactic sugars. They can't
100% replicate the functionality of proxies, promises (and by extension async
constructs), forak reference-enabled containers, among others.

Please note I'm saying this in mid-2018. Latest Chrome (on any planform
including latest Android), Firefox, Safari (on any platform including latest
iOS), and Edge are fully supported. This leaves me two major user camps that
have trouble accessing my site: (1) those with devices that they don't own and
can't upgrade and modify (e.g. pre-Windows 10 machines that users can't install
Chrome of Firefox) --- these are usually computers managed by institutions. 
lease just view my website at home or on your personal device (again, Hakuu is
now fully mobile friendly); (2) those on devices that they can't or don't want
to upgrade to the latest version of the OS --- this is the broken part of the
computing ecosystem that Intel/AMD/Microsoft/Apple/Google has to fix (for x86
desktops/laptops, iOS devices and Android devices).

## Use of Docker for font subsetting and Golang for scripting

It's definitely an overkill to use Docker and Golang. I just wanted to learn
new things. Mnjul's Intimate Home has been a prime venue for me to learn new
things (general software engineering, PHP, Flash, HTML5, front-end development
techniques, etc.).

I use [fonttools](https://github.com/fonttools/fonttools) for font subsetting.
This is quite a self-contained python repo, so at most I only needed a
virtualenv to use it, instead of an entire Docker container. 

As for using Golang for generating the subset glyphs and for building the
project... it's like I could've done the two scripts in Python in one hour, but
I decided to spend three days doing something unfamiliar and messing around with
runes. (I do love the concept of runes, which reminds me of when I worked on
FxOS keyboard app.)

## There is only a hollow npm package.json
`package.json` is only used to conveniently define needed packages during
development and deployment (linting and minification). No npm packages or any
nodejs constructs are required in the actual website code. As it's nonsense to
publish personal websites as a npm package, the usual fields in package.json are
missing.

I'm definitely keeping nodejs dependency to the minimum --- well, I used to
say non-web JavaScript is terrible. That was when V8 support of ES6 was
laughable, when too many concepts in general programming a novice JavaScript
programmer could screw up (well, a novice JavaScript programmer can screw up
pretty much everything thanks to JavaScript's design in its earlier versions).
Nowadays I'm less confident to make that assertion if people learn and write
everything from scratch in ES7/8 (and the lingering effect of my original
dislike for non-web JS would be, for example, my choosing Golang for the purpose
of  giving myself challenges, instead of nodejs.)

# Content
This repo does not have the actual content from Hakuu, as the content is the
non-technical aspect of the website. The Epilogue page is exceptional of this
since I need to declare something there.

Text is garbage CJK characters from a [generator by Dr. Chih-Hao Tsai](http://technology.chtsai.org/pseudotext/),
serving as Lorem Ipsem. Actual Lorem Ipsem text is used where I have English
text in Hakuu. 

Images are just random solid colors. Background music is white noise from Adobe
Audition. (Hakuu currently does not have images or background music so this
paragraph is irrelevant.)

# License
rain-engine.js, where code was derived from Codrop's [RainEffect](https://github.com/codrops/RainEffect/commits/master) repo,
is licensed under [Codrop's license](https://tympanus.net/Development/RainEffect/).
Any other part of this work is licensed under AGPLv3. (This is my personal
website's code, so it's licensed strictly, unlike my other open source projects.)
