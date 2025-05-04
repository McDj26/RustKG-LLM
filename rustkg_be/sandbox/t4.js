const split2DiffChunks = require("../utils/diff/splitChunksV3");

// Test split2DiffChunks
const originText = `<section id="main" class="content enum">
<h1 class="fqn"><span class="in-band">Enum <a href="../index.html">std</a>::<wbr><a href="index.html">io</a>::<wbr><a class="enum" href="">ErrorKind</a></span><span class="out-of-band"><span class="since" title="Stable since Rust version 1.0.0">1.0.0</span><span id="render-detail"><a id="toggle-all-docs" href="javascript:void(0)" title="collapse all docs">[<span class="inner">−</span>]</a></span><a id="src-4275" class="srclink" href="../../src/std/up/src/libstd/io/error.rs.html#83-169" title="goto source code">[src]</a></span></h1>
<pre class="rust enum">pub enum ErrorKind {
NotFound,
PermissionDenied,
ConnectionRefused,
ConnectionReset,
ConnectionAborted,
NotConnected,
AddrInUse,
AddrNotAvailable,
BrokenPipe,
AlreadyExists,
WouldBlock,
InvalidInput,
InvalidData,
TimedOut,
WriteZero,
Interrupted,
Other,
UnexpectedEof,
// some variants omitted`;
const modifiedText = `<section id="main-content" class="content"><div class="main-heading"><h1 class="fqn"><span class="in-band">Enum <a href="../index.html">std</a>::<wbr><a href="index.html">io</a>::<wbr><a class="enum" href="#">ErrorKind</a><button id="copy-path" onclick="copy_path(this)" title="Copy item path to clipboard"><img src="../../clipboard1.60.0.svg" width="19" height="18" alt="Copy item path"></button></span></h1><span class="out-of-band"><span class="since" title="Stable since Rust version 1.0.0">1.0.0</span> · <a class="srclink" href="../../src/std/io/error.rs.html#148-364">source</a> · <a id="toggle-all-docs" href="javascript:void(0)" title="collapse all docs">[<span class="inner">−</span>]</a></span></div><div class="docblock item-decl">
<pre class="rust enum"><code>#[non_exhaustive]
pub enum ErrorKind {
<details class="rustdoc-toggle type-contents-toggle" open=""><summary class="hideme"><span>Show 40 variants</span></summary>    NotFound,
PermissionDenied,
ConnectionRefused,
ConnectionReset,
HostUnreachable,
NetworkUnreachable,
ConnectionAborted,
NotConnected,
AddrInUse,
AddrNotAvailable,
NetworkDown,
BrokenPipe,
AlreadyExists,
WouldBlock,
NotADirectory,
IsADirectory,
DirectoryNotEmpty,
ReadOnlyFilesystem,
FilesystemLoop,
StaleNetworkFileHandle,
InvalidInput,
InvalidData,
TimedOut,
WriteZero,
StorageFull,
NotSeekable,
FilesystemQuotaExceeded,
FileTooLarge,
ResourceBusy,
ExecutableFileBusy,
Deadlock,
CrossesDevices,
TooManyLinks,
InvalidFilename,
ArgumentListTooLong,
Interrupted,
Unsupported,
UnexpectedEof,
OutOfMemory,
Other,
// some variants omitted`;
const contextLength = 50;
const windowLength = 200;
const chunks = split2DiffChunks(
  originText,
  modifiedText,
  contextLength,
  windowLength
);
console.log(chunks.map((chunk) => chunk.str).join("\n"));
