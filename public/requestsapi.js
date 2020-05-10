function editTwilie()
{
	console.log("2");
	var requestFormData = {};
	form = document.getElementById("editTwilie");
	for(var i=0; i < form.elements.length; i++)
	{
    	var e = form.elements[i];
    	requestFormData[e.id] = e.value;
	}
	var formValid = true;
    if($("#twitter_consumer_key").val().length == 0)
    {
      formValid = false;
    }
    if($("#twitter_consumer_secret").val().length == 0)
    {
      formValid = false;
    }
    if($("#twitter_access_token_key").val().length == 0)
    {
      formValid = false;
    }
    if($("#twitter_access_token_secret").val().length == 0)
    {
      formValid = false;
    }
    if($("#recipients").val().length == 0)
    {
      formValid = false;
    }
    console.log("3");
    if(formValid)
    {
		$.ajax({
			url: "/manage/editTwilie",
			method: "POST",
			data: JSON.stringify(requestFormData),
			contentType: "application/json; charset=utf-8",
	    	dataType: "json",
			success: function(result) {
				window.location.reload();
			}
		});
	}
	else
	{
		alert("Please fill all required fields before you finalize your registration.");
	}
}

function testTwilie()
{
    var requestFormData = {};
    $.ajax({
        url: "/test/testTwilie",
        method: "POST",
        data: JSON.stringify(requestFormData),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(result) {
            console.log("Test results: ",result);
            document.getElementById("testresults").innerHTML=JSON.stringify(result);
        }
    });
}