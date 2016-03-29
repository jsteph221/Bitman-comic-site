function SubmitDislike(input)
{
	console.log("in Submit Dislike function");

    document.formPlayback.action = "/dislikeplayback"
    
    document.formPlayback.submit();             // Submit the page

    return true;
}


function SubmitComment(input)
{
	console.log("in Submit Comment function");

    document.formPlayback.action = "/submitcomment"
    
    document.formPlayback.submit();             // Submit the page

    return true;
}

